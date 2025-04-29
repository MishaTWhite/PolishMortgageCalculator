/**
 * Puppeteer-based scraper optimized for Replit environment
 */
import puppeteer, { Browser, Page } from 'puppeteer';
import { ScrapeTask } from './scrapeTaskManager';
import { 
  RESOURCE_LIMITS, 
  DELAYS, 
  RETRY, 
  getRandomUserAgent, 
  getRandomDelay, 
  ROOM_TYPE_QUERIES 
} from './scraperConfig';
import fs from 'fs';
import path from 'path';
import { 
  logDebug, 
  logInfo, 
  logWarning, 
  logError, 
  getCurrentMemoryUsage 
} from './scraperLogger';

// Глобальные переменные для управления ресурсами
let browser: Browser | null = null;
let browserStartTime = 0;
let pagesProcessed = 0;

/**
 * Инициализирует браузер с проверкой ресурсов
 */
async function initBrowser(): Promise<Browser> {
  const enhancedOptions = {
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--disable-accelerated-2d-canvas',
      '--disable-infobars',
      '--window-size=1366,768',
      '--single-process',
      '--no-zygote',
      '--disable-gpu-sandbox',
      '--mute-audio'
    ],
    ignoreHTTPSErrors: true,
    timeout: 60000
  };

  logInfo(`Launching Puppeteer with options: ${JSON.stringify(enhancedOptions, null, 2)}`);
  
  try {
    browser = await puppeteer.launch(enhancedOptions);
    browserStartTime = Date.now();
    pagesProcessed = 0;
    logInfo('Puppeteer browser successfully launched');
    return browser;
  } catch (error) {
    logError(`Failed to launch Puppeteer browser: ${error}`);
    throw error;
  }
}

/**
 * Закрывает браузер и очищает ресурсы
 */
async function closeBrowser(): Promise<void> {
  try {
    if (browser) {
      logInfo('Closing browser');
      await browser.close().catch(e => logError(`Error closing browser: ${e}`));
      browser = null;
    }
    
    // Принудительная сборка мусора
    if (global.gc) {
      global.gc();
    }
  } catch (err) {
    logError(`Error closing browser: ${err}`);
  }
}

/**
 * Проверяет необходимость перезапуска браузера
 * на основе использования памяти и других метрик
 */
async function checkBrowserHealth(): Promise<boolean> {
  // Проверяем текущую память
  const memoryMb = getCurrentMemoryUsage();
  
  // Если превышен критический порог памяти
  if (memoryMb > RESOURCE_LIMITS.MEMORY.CRITICAL_THRESHOLD) {
    logWarning(`Memory usage critical: ${memoryMb} MB. Restarting browser.`);
    await closeBrowser();
    return false;
  }
  
  // Если превышен порог предупреждения
  if (memoryMb > RESOURCE_LIMITS.MEMORY.WARNING_THRESHOLD) {
    logWarning(`High memory usage: ${memoryMb} MB`);
  }
  
  // Проверяем количество обработанных страниц
  if (pagesProcessed >= RESOURCE_LIMITS.BROWSER_SESSION.MAX_PAGES_PER_SESSION) {
    logInfo(`Processed ${pagesProcessed} pages. Restarting browser for fresh session.`);
    await closeBrowser();
    return false;
  }
  
  // Проверяем время работы браузера
  const sessionDuration = Date.now() - browserStartTime;
  if (sessionDuration > RESOURCE_LIMITS.BROWSER_SESSION.MAX_SESSION_DURATION) {
    logInfo(`Browser session duration: ${Math.round(sessionDuration/1000)}s. Restarting browser.`);
    await closeBrowser();
    return false;
  }
  
  return true;
}

/**
 * Настраивает страницу для скрапинга
 */
async function setupPage(page: Page): Promise<void> {
  // Устанавливаем User-Agent
  await page.setUserAgent(getRandomUserAgent());
  
  // Блокируем изображения и неважные ресурсы
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });
  
  // Увеличиваем таймауты для медленных соединений
  page.setDefaultTimeout(DELAYS.NAVIGATION.PAGE_LOAD_TIMEOUT);
  page.setDefaultNavigationTimeout(DELAYS.NAVIGATION.PAGE_LOAD_TIMEOUT);
  
  logDebug('Page set up with resource blocking and timeouts');
}

/**
 * Проверяет наличие антибот-защиты на странице
 */
async function checkForBotDetection(page: Page): Promise<boolean> {
  try {
    // Получаем заголовок и содержимое страницы
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const bodyLength = await page.evaluate(() => document.body.innerHTML.length);
    
    logDebug(`Page title: "${title}", content length: ${bodyLength}`);
    
    // Проверяем признаки блокировки
    const botDetectionPhrases = [
      'captcha', 'robot', 'automated', 'bot detection',
      'verify you are human', 'are you a robot',
      'access denied', 'forbidden', 'cloudflare'
    ];
    
    for (const phrase of botDetectionPhrases) {
      if (bodyText.toLowerCase().includes(phrase) || title.toLowerCase().includes(phrase)) {
        logWarning(`Bot detection triggered: Found phrase "${phrase}" on page`);
        return true;
      }
    }
    
    // Проверяем, не слишком ли короткая страница (возможно, ошибка)
    if (bodyLength < 5000) {
      logWarning(`Suspiciously small page: ${bodyLength} bytes. Possible bot detection.`);
      return true;
    }
    
    // Проверяем наличие ключевых элементов Otodom
    const hasMainContent = await page.evaluate(() => {
      return !!document.querySelector('main') || 
             !!document.querySelector('div[data-cy="search-listing"]') ||
             !!document.querySelector('[data-cy="search.listing"]');
    });
    
    if (!hasMainContent) {
      logWarning('Main content element not found. Possible bot detection or wrong page loaded.');
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`Error in bot detection check: ${error}`);
    return true; // При ошибке считаем, что сработала защита
  }
}

/**
 * Выполняет случайную прокрутку страницы для имитации пользователя
 */
async function performRandomScrolling(page: Page): Promise<void> {
  logDebug('Performing random scrolling');
  
  try {
    // Определяем высоту страницы
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const windowHeight = await page.evaluate(() => window.innerHeight);
    
    // Количество шагов прокрутки
    const scrollSteps = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < scrollSteps; i++) {
      // Случайное расстояние прокрутки
      const scrollDistance = Math.max(100, Math.floor(windowHeight * (0.1 + Math.random() * 0.2)));
      
      // В основном скроллим вниз, иногда вверх
      const direction = Math.random() > 0.2 ? 1 : -1;
      
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance * direction);
      
      // Пауза между прокрутками
      const delay = getRandomDelay(300, 800);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } catch (error) {
    logError(`Error during random scrolling: ${error}`);
  }
}

/**
 * Получает строку запроса для определенного типа комнат
 */
function getRoomTypeQuery(roomType: string): string {
  if (roomType === 'oneRoom' || roomType === 'twoRoom' || 
      roomType === 'threeRoom' || roomType === 'fourPlusRoom') {
    return ROOM_TYPE_QUERIES[roomType];
  }
  return '';
}

/**
 * Извлекает общее число объявлений из текста на странице
 */
function extractReportedCount(text: string): number {
  const patterns = [
    /(\d+)\s+ogłosz/i,      // "123 ogłoszeń"
    /znaleziono\s+(\d+)/i,  // "znaleziono 123"
    /(\d+)\s+ofert/i,       // "123 ofert"
    /(\d+)\s+wynik/i,       // "123 wyników"
    /(\d+)\s+nieruchom/i    // "123 nieruchomości"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1].replace(/\s+/g, ''), 10);
    }
  }

  return 0;
}

/**
 * Парсит цену из текста объявления
 */
function parsePrice(priceText: string): number {
  if (!priceText) return 0;
  
  // Удаляем все, кроме цифр и разделителей
  const cleaned = priceText.replace(/[^0-9,.]/g, '');
  
  // Заменяем запятую на точку для корректного парсинга
  const normalized = cleaned.replace(/,/g, '.');
  
  // Пробуем извлечь число
  const price = parseFloat(normalized);
  
  return isNaN(price) ? 0 : price;
}

/**
 * Парсит площадь из текста объявления
 */
function parseArea(areaText: string): number {
  if (!areaText) return 0;
  
  // Ищем число перед "m²" или "m2"
  const match = areaText.match(/(\d+[.,]?\d*)\s*m[²2]/i);
  if (match && match[1]) {
    // Заменяем запятую на точку
    const normalized = match[1].replace(',', '.');
    const area = parseFloat(normalized);
    return isNaN(area) ? 0 : area;
  }
  
  return 0;
}

/**
 * Рассчитывает среднее значение массива чисел
 */
function calculateAverage(values: number[]): number {
  if (!values.length) return 0;
  
  // Используем неподверженную переполнению формулу
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  
  return sum / values.length;
}

/**
 * Обрабатывает текущую страницу и извлекает данные объявлений
 */
async function processCurrentPage(
  page: Page, 
  cityNormalized: string, 
  districtName: string
): Promise<{
  prices: number[],
  pricesPerM2: number[],
  areas: number[],
  reportedCount: number
}> {
  // Массивы для сбора данных
  const prices: number[] = [];
  const pricesPerM2: number[] = [];
  const areas: number[] = [];
  let reportedCount = 0;
  
  try {
    // Логируем текущий URL
    const currentUrl = page.url();
    logInfo(`Processing page: ${currentUrl}`);
    
    // Ждем загрузки содержимого
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Получаем общее количество объявлений
    const countText = await page.evaluate(() => {
      const counter = document.querySelector('[data-cy="search-listing-panel-counter"]');
      if (counter) return counter.textContent || '';
      
      const counterAlt = document.querySelector('.css-19fwpg4, .css-1qvf2qk, [data-cy^="qa-listing"]');
      if (counterAlt) return counterAlt.textContent || '';
      
      return document.body.innerText.substring(0, 500); // Первые 500 символов
    });
    
    reportedCount = extractReportedCount(countText);
    logInfo(`Reported count of listings: ${reportedCount}`);
    
    // Главный селектор для объявлений - пробуем несколько вариантов
    const listingSelectors = [
      'article[data-cy="listing-item"]',
      'div[data-cy="search.listing"] article',
      '[data-cy="search-listing-panel-wrapper"] article',
      '[data-cy^="qa-listing-"] article',
      'article.css-1qz6v50'
    ];
    
    // Пробуем найти объявления по разным селекторам
    for (const selector of listingSelectors) {
      const hasListings = await page.evaluate((sel) => {
        const listings = document.querySelectorAll(sel);
        return listings.length > 0;
      }, selector);
      
      if (hasListings) {
        logInfo(`Found listings using selector: ${selector}`);
        
        // Извлекаем данные из найденных объявлений
        const listingsData = await page.evaluate((sel) => {
          const listings = document.querySelectorAll(sel);
          const results = [];
          
          const findElementWithText = (parent: Element, textPart: string): string => {
            const elements = parent.querySelectorAll('*');
            for (const el of Array.from(elements)) {
              if (el.textContent && el.textContent.includes(textPart)) {
                return el.textContent.trim();
              }
            }
            return '';
          };
          
          for (const listing of Array.from(listings)) {
            try {
              // Извлекаем цену
              let priceElement = listing.querySelector('[data-cy="listing-item-price"]');
              if (!priceElement) {
                priceElement = listing.querySelector('.css-1qx6ujm, .css-10b0gli, [aria-label*="zł"]');
              }
              
              const priceText = priceElement?.textContent?.trim() || '';
              
              // Извлекаем площадь
              let areaText = '';
              const areaElement = listing.querySelector('[data-testid="area-value"], [aria-label*="m²"]');
              
              if (areaElement) {
                areaText = areaElement.textContent?.trim() || '';
              } else {
                // Если нет специального элемента, ищем текст с "m²"
                areaText = findElementWithText(listing, 'm²');
              }
              
              // Проверка на наличие и валидность данных
              if (priceText && areaText) {
                results.push({
                  price: priceText,
                  area: areaText
                });
              }
            } catch (e) {
              // Пропускаем ошибки при обработке отдельных объявлений
              continue;
            }
          }
          
          return results;
        }, selector);
        
        // Обрабатываем собранные данные
        for (const item of listingsData) {
          const price = parsePrice(item.price);
          const area = parseArea(item.area);
          
          if (price > 0 && area > 0) {
            prices.push(price);
            areas.push(area);
            pricesPerM2.push(price / area);
          }
        }
        
        logInfo(`Processed ${listingsData.length} listings, extracted ${prices.length} valid prices`);
        break; // Используем первый подходящий селектор
      }
    }
    
    // Фильтруем данные
    const filteredPrices = prices.filter(price => price > 10000 && price < 10000000);
    const filteredAreas = areas.filter(area => area > 10 && area < 500);
    const filteredPricesPerM2 = pricesPerM2.filter(price => price > 1000 && price < 100000);
    
    logInfo(`Filtered data: ${filteredPrices.length} prices, ${filteredAreas.length} areas, ${filteredPricesPerM2.length} prices per m²`);
    
    return {
      prices: filteredPrices,
      pricesPerM2: filteredPricesPerM2,
      areas: filteredAreas,
      reportedCount
    };
  } catch (error) {
    logError(`Error processing page: ${error}`);
    return { prices, pricesPerM2, areas, reportedCount };
  }
}

/**
 * Обрабатывает первую страницу результатов поиска
 */
async function processFirstPage(
  page: Page,
  baseSearchUrl: string,
  cityNormalized: string,
  districtName: string,
  roomType: string
): Promise<{
  prices: number[],
  pricesPerM2: number[],
  areas: number[],
  reportedCount: number,
  hasNextPage: boolean
}> {
  try {
    // Формируем URL с параметрами поиска
    const roomTypeQuery = getRoomTypeQuery(roomType);
    const searchUrl = `${baseSearchUrl}${roomTypeQuery}`;
    
    logInfo(`Navigating to: ${searchUrl}`);
    
    // Открываем страницу поиска
    const response = await page.goto(searchUrl, { 
      waitUntil: 'networkidle0',
      timeout: DELAYS.NAVIGATION.PAGE_LOAD_TIMEOUT 
    });
    
    // Проверяем статус ответа
    if (!response) {
      logError('No response received when navigating to search page');
      return { prices: [], pricesPerM2: [], areas: [], reportedCount: 0, hasNextPage: false };
    }
    
    const status = response.status();
    const responseUrl = response.url();
    
    logInfo(`Page loaded with status ${status}, URL: ${responseUrl}`);
    
    if (status >= 400) {
      logError(`Failed to load search page: HTTP ${status}`);
      return { prices: [], pricesPerM2: [], areas: [], reportedCount: 0, hasNextPage: false };
    }
    
    // Ждем небольшой случайной задержки
    await page.waitForTimeout(getRandomDelay(1000, 2000));
    
    // Проверяем на защиту от ботов
    const hasBotDetection = await checkForBotDetection(page);
    if (hasBotDetection) {
      logError('Bot detection triggered on first page');
      return { prices: [], pricesPerM2: [], areas: [], reportedCount: 0, hasNextPage: false };
    }
    
    // Выполняем случайную прокрутку страницы
    await performRandomScrolling(page);
    
    // Обрабатываем текущую страницу
    const pageData = await processCurrentPage(page, cityNormalized, districtName);
    
    // Проверяем наличие кнопки "Następna" (Следующая)
    const hasNextPage = await page.evaluate(() => {
      const nextButtons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      for (const button of nextButtons) {
        const text = button.textContent || '';
        if (text.includes('Następn') || text.includes('Next')) {
          return true;
        }
      }
      return false;
    });
    
    logInfo(`First page processed, has next page: ${hasNextPage}`);
    
    return { 
      ...pageData,
      hasNextPage 
    };
  } catch (error) {
    logError(`Error processing first page: ${error}`);
    return { prices: [], pricesPerM2: [], areas: [], reportedCount: 0, hasNextPage: false };
  }
}

/**
 * Переходит на следующую страницу результатов
 */
async function navigateToNextPage(page: Page, currentPageNum: number): Promise<boolean> {
  try {
    logInfo(`Attempting to navigate to page ${currentPageNum + 1}`);
    
    // Ищем кнопку "Następna" (Следующая)
    const nextButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      for (const button of buttons) {
        const text = button.textContent || '';
        if (text.includes('Następn') || text.includes('Next')) {
          // Возвращаем индекс кнопки
          return buttons.indexOf(button);
        }
      }
      return -1;
    });
    
    if (nextButton === -1) {
      logWarning('Next page button not found');
      return false;
    }
    
    // Кликаем по кнопке "Следующая"
    await page.evaluate((buttonIndex) => {
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      if (buttons[buttonIndex]) {
        (buttons[buttonIndex] as HTMLElement).click();
      }
    }, nextButton);
    
    // Ждем загрузки новой страницы
    await page.waitForNavigation({ 
      waitUntil: 'networkidle0',
      timeout: DELAYS.NAVIGATION.PAGE_LOAD_TIMEOUT 
    });
    
    // Ждем небольшой случайной задержки
    await page.waitForTimeout(getRandomDelay(1000, 2000));
    
    // Проверяем на защиту от ботов на новой странице
    const hasBotDetection = await checkForBotDetection(page);
    if (hasBotDetection) {
      logError(`Bot detection triggered on page ${currentPageNum + 1}`);
      return false;
    }
    
    // Выполняем случайную прокрутку страницы
    await performRandomScrolling(page);
    
    logInfo(`Successfully navigated to page ${currentPageNum + 1}`);
    return true;
  } catch (error) {
    logError(`Error navigating to next page: ${error}`);
    return false;
  }
}

/**
 * Функция для выполнения скрапинга с повторными попытками
 */
async function runWithRetry<T>(
  task: ScrapeTask,
  fn: () => Promise<T>,
  maxRetries = RETRY.MAX_RETRIES
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries) {
        logError(`Max retries (${maxRetries}) reached for task ${task.id}. Last error: ${error}`);
        throw error;
      }
      
      const delay = RETRY.BASE_DELAY * Math.pow(RETRY.BACKOFF_FACTOR, retries);
      logWarning(`Retry ${retries}/${maxRetries} after error: ${error}. Waiting ${delay}ms before next attempt.`);
      
      // Сохраняем промежуточные результаты
      saveIntermediateResults(task, { error: String(error), retryCount: retries });
      
      // Ждем перед повторной попыткой
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Сохраняет результаты скрапинга в промежуточный файл
 */
function saveIntermediateResults(task: ScrapeTask, results: any): void {
  try {
    const dir = path.join(process.cwd(), 'scraper_results');
    
    // Создаем директорию, если не существует
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filePath = path.join(dir, `intermediate_${task.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify({
      task,
      results,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    logDebug(`Saved intermediate results for task ${task.id}`);
  } catch (error) {
    logError(`Error saving intermediate results: ${error}`);
  }
}

/**
 * Основная функция для скрапинга данных о недвижимости с помощью Puppeteer
 */
export async function scrapePropertyData(task: ScrapeTask): Promise<any> {
  // Инициализируем результаты
  const results = {
    cityNormalized: task.cityNormalized,
    district: task.districtName,
    roomType: task.roomType,
    fetchDate: task.fetchDate,
    totalListings: 0,
    avgPrice: 0,
    avgPricePerM2: 0,
    avgArea: 0,
    medianPrice: 0,
    medianPricePerM2: 0,
    medianArea: 0,
    listingsProcessed: 0,
    taskId: task.id,
    status: 'success',
    error: ''
  };
  
  try {
    logInfo(`Starting property data scrape task: ${task.id} (${task.cityUrl}/${task.districtSearchTerm}/${task.roomType})`);
    
    // Проверяем, нужно ли инициализировать или перезапустить браузер
    if (!browser || !(await checkBrowserHealth())) {
      logInfo('Browser needs initialization or restart');
      logInfo(`Current memory usage before browser init: ${getCurrentMemoryUsage()} MB`);
      browser = await initBrowser();
    }
    
    const baseSearchUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${task.cityUrl}/${task.districtSearchTerm}?`;
    
    // Обрабатываем первую страницу и собираем начальные данные
    const page = await browser.newPage();
    await setupPage(page);
    
    try {
      // Увеличиваем счетчик обработанных страниц
      pagesProcessed++;
      
      // Обрабатываем первую страницу
      const firstPageData = await runWithRetry(
        task,
        () => processFirstPage(page, baseSearchUrl, task.cityNormalized, task.districtName, task.roomType)
      );
      
      // Массивы для сбора данных со всех страниц
      let allPrices = [...firstPageData.prices];
      let allPricesPerM2 = [...firstPageData.pricesPerM2];
      let allAreas = [...firstPageData.areas];
      const reportedCount = firstPageData.reportedCount;
      
      // Ограничиваем количество страниц
      const maxPages = Math.min(
        Math.ceil(reportedCount / 24), // Примерно 24 объявления на странице
        RESOURCE_LIMITS.MAX_PAGES_PER_TASK
      );
      
      // Если есть дополнительные страницы, обрабатываем их
      if (firstPageData.hasNextPage && maxPages > 1) {
        for (let pageNum = 1; pageNum < maxPages; pageNum++) {
          // Проверяем здоровье браузера перед переходом на следующую страницу
          if (!(await checkBrowserHealth())) {
            logInfo('Browser restarted due to health check. Ending page processing.');
            break;
          }
          
          // Переходим на следующую страницу
          const navigated = await runWithRetry(
            task,
            () => navigateToNextPage(page, pageNum)
          );
          
          if (!navigated) {
            logWarning(`Failed to navigate to page ${pageNum + 1}. Stopping pagination.`);
            break;
          }
          
          // Увеличиваем счетчик обработанных страниц
          pagesProcessed++;
          
          // Обрабатываем текущую страницу
          const pageData = await runWithRetry(
            task,
            () => processCurrentPage(page, task.cityNormalized, task.districtName)
          );
          
          // Добавляем данные в общие массивы
          allPrices.push(...pageData.prices);
          allPricesPerM2.push(...pageData.pricesPerM2);
          allAreas.push(...pageData.areas);
          
          // Не слишком быстро переходим на следующую страницу
          await page.waitForTimeout(getRandomDelay(2000, 4000));
        }
      }
      
      // Закрываем страницу
      await page.close();
      
      // Если нет данных, возвращаем ошибку
      if (allPrices.length === 0) {
        throw new Error('No property data collected');
      }
      
      // Сортируем массивы для вычисления медианы
      allPrices.sort((a, b) => a - b);
      allPricesPerM2.sort((a, b) => a - b);
      allAreas.sort((a, b) => a - b);
      
      // Вычисляем средние значения
      const avgPrice = calculateAverage(allPrices);
      const avgPricePerM2 = calculateAverage(allPricesPerM2);
      const avgArea = calculateAverage(allAreas);
      
      // Вычисляем медианы
      const medianPriceIndex = Math.floor(allPrices.length / 2);
      const medianPricePerM2Index = Math.floor(allPricesPerM2.length / 2);
      const medianAreaIndex = Math.floor(allAreas.length / 2);
      
      const medianPrice = allPrices[medianPriceIndex] || 0;
      const medianPricePerM2 = allPricesPerM2[medianPricePerM2Index] || 0;
      const medianArea = allAreas[medianAreaIndex] || 0;
      
      // Обновляем результаты
      results.totalListings = reportedCount;
      results.avgPrice = Math.round(avgPrice);
      results.avgPricePerM2 = Math.round(avgPricePerM2);
      results.avgArea = Math.round(avgArea * 10) / 10; // Округляем до 1 десятичного знака
      results.medianPrice = Math.round(medianPrice);
      results.medianPricePerM2 = Math.round(medianPricePerM2);
      results.medianArea = Math.round(medianArea * 10) / 10;
      results.listingsProcessed = allPrices.length;
      
      logInfo(`Scraping completed for ${task.id}: ${results.listingsProcessed} listings processed`);
    } finally {
      // Закрываем страницу в блоке finally, чтобы гарантировать закрытие даже при ошибках
      if (page) {
        await page.close().catch(e => logError(`Error closing page: ${e}`));
      }
    }
    
    return results;
  } catch (error) {
    logError(`Error in scrapePropertyData: ${error}`);
    
    results.status = 'error';
    results.error = String(error);
    
    return results;
  }
}