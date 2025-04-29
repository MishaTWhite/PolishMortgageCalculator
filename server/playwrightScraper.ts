/**
 * Основной модуль скрапинга с использованием Playwright
 */
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
  BROWSER_LAUNCH_OPTIONS,
  DELAYS,
  RETRY,
  ANTIBOT,
  RESOURCE_LIMITS,
  ROOM_TYPE_QUERIES,
  getRandomUserAgent,
  getRandomPolishLocation,
  getRandomDelay
} from './scraperConfig';
import {
  logInfo,
  logError,
  logWarning,
  logDebug,
  getCurrentMemoryUsage,
  logMemoryUsage
} from './scraperLogger';
import { ScrapeTask, registerTaskProcessor } from './scrapeTaskManager';

// Директория для промежуточных результатов
const RESULTS_DIR = path.join(process.cwd(), 'scraper_results');

// Создаем директорию, если не существует
if (!fs.existsSync(RESULTS_DIR)) {
  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  } catch (err) {
    console.error(`Failed to create results directory: ${err}`);
  }
}

// Глобальные переменные для управления ресурсами
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let browserStartTime: number = 0;
let pagesProcessed: number = 0;

/**
 * Инициализирует браузер с проверкой ресурсов
 */
async function initBrowser(): Promise<Browser> {
  // Проверяем текущее использование памяти
  const memoryMb = getCurrentMemoryUsage();
  logInfo(`Current memory usage before browser init: ${memoryMb} MB`);
  
  if (browser) {
    logInfo('Browser instance already exists, closing it first');
    await closeBrowser();
  }
  
  logInfo('Initializing browser with enhanced options for Replit environment');
  
  // Расширенные опции для запуска в Replit
  const enhancedOptions = {
    ...BROWSER_LAUNCH_OPTIONS,
    executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH 
      ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium/chrome-linux/chrome` 
      : undefined,
    args: [
      ...(BROWSER_LAUNCH_OPTIONS.args || []),
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    chromiumSandbox: false
  };

  logInfo(`Launch options: ${JSON.stringify(enhancedOptions, null, 2)}`);
  
  try {
    browser = await chromium.launch(enhancedOptions);
    browserStartTime = Date.now();
    pagesProcessed = 0;
    logInfo('Browser successfully launched');
    return browser;
  } catch (error) {
    logError(`Browser launch failed: ${error}`);
    // Попытка запуска с более простыми опциями
    logInfo('Trying with minimal options');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    logInfo('Browser launched with minimal options');
    return browser;
  }
}

/**
 * Создает контекст браузера с настройками против обнаружения
 */
async function createContext(browser: Browser): Promise<BrowserContext> {
  // Получаем случайный User-Agent и локацию
  const userAgent = getRandomUserAgent();
  const location = getRandomPolishLocation();
  
  logInfo('Creating browser context', {
    userAgent: userAgent.substring(0, 30) + '...',
    location
  });
  
  // Создаем контекст с настройками
  context = await browser.newContext({
    userAgent,
    viewport: { width: 1366, height: 768 },
    locale: 'pl-PL',
    geolocation: location,
    permissions: ['geolocation'],
    colorScheme: 'light',
    deviceScaleFactor: 1,
    bypassCSP: true,
    javaScriptEnabled: true,
    hasTouch: false,
    ignoreHTTPSErrors: true
  });
  
  return context;
}

/**
 * Закрывает браузер и очищает ресурсы
 */
async function closeBrowser(): Promise<void> {
  try {
    if (context) {
      logInfo('Closing browser context');
      await context.close().catch(e => logError(`Error closing context: ${e}`));
      context = null;
    }
    
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
 * Настраивает страницу для скрапинга, блокируя ненужные ресурсы
 */
async function setupPage(page: Page): Promise<void> {
  // Блокируем загрузку лишних ресурсов для экономии памяти
  await page.route('**/*', async route => {
    const request = route.request();
    const resourceType = request.resourceType();
    
    // Блокируем изображения, шрифты, стили, медиа
    if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  
  // Устанавливаем таймауты
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
    
    // Проверяем наличие ключевых слов антибот-защиты
    for (const phrase of ANTIBOT.DETECTION_PHRASES) {
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
    const hasMainContent = await page.$('main, div[data-cy="search-listing"]');
    
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
 * Выполняет случайную прокрутку страницы (имитация человека)
 */
async function performRandomScrolling(page: Page): Promise<void> {
  if (!ANTIBOT.USER_BEHAVIOR.RANDOM_SCROLLING) return;
  
  logDebug('Performing random scrolling');
  
  try {
    // Определяем высоту страницы
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const windowHeight = await page.evaluate(() => window.innerHeight);
    
    // Количество шагов прокрутки
    const scrollSteps = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < scrollSteps; i++) {
      // Случайное расстояние прокрутки (от 100px до 30% высоты окна)
      const scrollDistance = Math.max(100, Math.floor(windowHeight * (0.1 + Math.random() * 0.2)));
      
      // В основном скроллим вниз, иногда вверх
      const direction = Math.random() > 0.2 ? 1 : -1;
      
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance * direction);
      
      // Пауза между прокрутками
      const delay = getRandomDelay(300, 800);
      await page.waitForTimeout(delay);
    }
  } catch (error) {
    logError(`Error during random scrolling: ${error}`);
  }
}

/**
 * Имитирует поведение пользователя, посещающего случайное объявление
 */
async function visitRandomListing(page: Page): Promise<boolean> {
  if (Math.random() > ANTIBOT.USER_BEHAVIOR.VISIT_RANDOM_LISTINGS) return false;
  
  logInfo('Attempting to visit a random listing');
  
  try {
    // Находим все объявления на странице
    const listings = await page.$$('article a, [data-cy="listing-item"] a, [data-cy="search.listing"] a');
    
    if (listings.length === 0) {
      logDebug('No listing links found');
      return false;
    }
    
    // Выбираем случайное объявление
    const randomIndex = Math.floor(Math.random() * listings.length);
    const randomListing = listings[randomIndex];
    
    // Запоминаем текущий URL
    const currentUrl = page.url();
    
    // Кликаем на объявление
    logInfo(`Clicking on random listing (${randomIndex + 1}/${listings.length})`);
    await randomListing.click();
    
    // Ждем загрузки страницы объявления
    await page.waitForLoadState('networkidle', { timeout: 10000 })
      .catch(e => logWarning(`Timeout waiting for listing page: ${e}`));
    
    // Проверяем, изменился ли URL
    const newUrl = page.url();
    if (newUrl === currentUrl) {
      logWarning('URL did not change after clicking listing');
      return false;
    }
    
    // Имитируем просмотр деталей объявления
    await performRandomScrolling(page);
    
    // Задержка в стиле "чтение деталей"
    const viewingTime = getRandomDelay(3000, 8000);
    logInfo(`Viewing listing for ${viewingTime}ms`);
    await page.waitForTimeout(viewingTime);
    
    // Возвращаемся на страницу результатов
    logInfo('Going back to search results');
    await page.goBack({ waitUntil: 'networkidle' });
    
    // Проверяем, что вернулись на исходную страницу
    const backUrl = page.url();
    const backToResults = backUrl === currentUrl;
    
    if (!backToResults) {
      logWarning(`Did not return to original URL: ${currentUrl} vs ${backUrl}`);
    }
    
    return backToResults;
  } catch (error) {
    logError(`Error visiting random listing: ${error}`);
    
    // Пробуем вернуться назад на всякий случай
    try {
      await page.goBack({ waitUntil: 'networkidle' });
    } catch (e) {
      logError(`Failed to go back after error: ${e}`);
    }
    
    return false;
  }
}

/**
 * Имитирует естественную навигацию пользователя перед скрапингом
 */
async function simulateNaturalBrowsing(page: Page): Promise<void> {
  logInfo('Starting natural browsing simulation');
  
  try {
    // Посещаем главную страницу
    logInfo('Visiting Otodom homepage');
    await page.goto('https://www.otodom.pl/', { 
      waitUntil: 'networkidle'
    });
    
    // Логируем URL после загрузки страницы
    const currentUrl = page.url();
    logInfo(`Current URL after navigation: ${currentUrl}`);
    
    // Случайная задержка как будто "смотрим главную"
    const homeDelay = getRandomDelay(
      DELAYS.NAVIGATION.MIN_AFTER_PAGE_LOAD,
      DELAYS.NAVIGATION.MAX_AFTER_PAGE_LOAD
    );
    logDebug(`Waiting for ${homeDelay}ms on homepage`);
    await page.waitForTimeout(homeDelay);
    
    // Немного прокручиваем главную страницу
    await performRandomScrolling(page);
    
    // Переходим в раздел продажи
    logInfo('Navigating to sales category');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', { 
      waitUntil: 'networkidle'
    });
    
    // Еще одна задержка
    const categoryDelay = getRandomDelay(
      DELAYS.NAVIGATION.MIN_AFTER_PAGE_LOAD,
      DELAYS.NAVIGATION.MAX_AFTER_PAGE_LOAD
    );
    logDebug(`Waiting for ${categoryDelay}ms on category page`);
    await page.waitForTimeout(categoryDelay);
    
    // Прокручиваем и страницу категории
    await performRandomScrolling(page);
    
    logInfo('Natural browsing simulation completed');
  } catch (error) {
    logError(`Error during natural browsing: ${error}`);
    throw error;
  }
}

/**
 * Получает строку запроса для определенного типа комнат
 */
function getRoomTypeQuery(roomType: string): string {
  return ROOM_TYPE_QUERIES[roomType as keyof typeof ROOM_TYPE_QUERIES] || 
         ROOM_TYPE_QUERIES.oneRoom;
}

/**
 * Извлекает общее число объявлений из текста на странице
 */
function extractReportedCount(text: string): number {
  const patterns = [
    /(\d+)\s+ogłosz/i,      // "123 ogłoszeń"
    /znaleziono\s+(\d+)/i,  // "znaleziono 123"
    /(\d+)\s+ofert/i,       // "123 ofert"
    /(\d+)\s+mieszk/i,      // "123 mieszkań"
    /(\d+)/                 // просто число
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  return 0;
}

/**
 * Парсит цену из текста объявления с валидацией
 */
function parsePrice(priceText: string): number {
  try {
    // Проверка на "Zapytaj o cenę" (Спросить о цене)
    if (priceText.toLowerCase().includes('zapytaj') || 
        (priceText.toLowerCase().includes('cen') && !priceText.toLowerCase().includes('zł'))) {
      logWarning(`Skipping "Zapytaj o cenę" listing (no price available)`);
      return 0;
    }
    
    // Удаляем все, кроме цифр
    const digits = priceText.replace(/[^\d]/g, '');
    if (!digits) return 0;
    
    const price = parseInt(digits, 10);
    
    // Валидация диапазона цен (50 тыс. - 10 млн. zł)
    const MIN_VALID_PRICE = 50000;   // 50 тыс. zł
    const MAX_VALID_PRICE = 10000000; // 10 млн. zł
    
    if (isNaN(price) || price < MIN_VALID_PRICE || price > MAX_VALID_PRICE) {
      logWarning(`Price out of valid range: ${price} zł (valid: ${MIN_VALID_PRICE}-${MAX_VALID_PRICE} zł)`);
      return 0;
    }
    
    return price;
  } catch (error) {
    logError(`Error parsing price "${priceText}": ${error}`);
    return 0;
  }
}

/**
 * Парсит площадь из текста объявления с валидацией
 */
function parseArea(areaText: string): number {
  try {
    // Извлекаем числа и заменяем запятую на точку
    const cleaned = areaText.replace(/[^\d,.]/g, '').replace(',', '.');
    if (!cleaned) return 0;
    
    const area = parseFloat(cleaned);
    
    // Валидация диапазона площади (10-1000 м²)
    const MIN_VALID_AREA = 10;  // 10 м²
    const MAX_VALID_AREA = 1000; // 1000 м²
    
    if (isNaN(area) || area < MIN_VALID_AREA || area > MAX_VALID_AREA) {
      logWarning(`Area out of valid range: ${area} m² (valid: ${MIN_VALID_AREA}-${MAX_VALID_AREA} m²)`);
      return 0;
    }
    
    return area;
  } catch (error) {
    logError(`Error parsing area "${areaText}": ${error}`);
    return 0;
  }
}

/**
 * Рассчитывает среднее значение массива чисел с защитой от переполнения
 */
function calculateAverage(values: number[]): number {
  try {
    if (values.length === 0) return 0;
    
    // Фильтруем нулевые значения и проверяем, что осталось хотя бы одно
    const nonZeroValues = values.filter(value => value > 0);
    if (nonZeroValues.length === 0) return 0;
    
    // Используем безопасный метод для суммирования
    let sum = 0;
    for (const value of nonZeroValues) {
      // Проверка на переполнение
      if (sum > Number.MAX_SAFE_INTEGER - value) {
        logWarning(`Potential numeric overflow during average calculation`);
        // Используем среднее арифметическое вместо суммы всех значений
        return Math.round(sum / nonZeroValues.length);
      }
      sum += value;
    }
    
    return Math.round(sum / nonZeroValues.length);
  } catch (error) {
    logError(`Error calculating average: ${error}`);
    return 0;
  }
}

/**
 * Обрабатывает текущую страницу и извлекает данные объявлений
 */
async function processCurrentPage(
  page: Page, 
  pageNum: number
): Promise<{
  prices: number[];
  areas: number[];
  pricesPerSqm: number[];
}> {
  logInfo(`Processing page ${pageNum}`);
  pagesProcessed++;
  
  // Ожидаем появления элементов с объявлениями
  try {
    await page.waitForSelector(
      'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
      { timeout: 15000 }
    );
  } catch (error) {
    logWarning(`Timeout waiting for listing elements on page ${pageNum}`);
    
    // Проверяем, не сработала ли защита
    const botDetected = await checkForBotDetection(page);
    if (botDetected) {
      throw new Error('Bot detection triggered while processing page');
    }
  }
  
  // Иногда прокручиваем страницу
  await performRandomScrolling(page);
  
  // Инициализация массивов для данных
  const prices: number[] = [];
  const areas: number[] = [];
  const pricesPerSqm: number[] = [];
  
  // Извлекаем данные объявлений с текущей страницы
  const listingsData = await page.$$eval(
    'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
    (listings) => {
      return listings.map(listing => {
        // Функция для поиска элементов с определенным текстом
        const findElementWithText = (parent: Element, textPart: string): string => {
          // Поиск по атрибутам
          const dataEl = parent.querySelector(
            `[data-cy*="${textPart}"], [data-testid*="${textPart}"]`
          );
          if (dataEl) return dataEl.textContent || '';
          
          // Поиск по содержимому текста в разных типах элементов
          for (const selector of ['p', 'span', 'div', 'strong']) {
            for (const el of Array.from(parent.querySelectorAll(selector))) {
              if (el.textContent && el.textContent.includes(textPart)) {
                return el.textContent;
              }
            }
          }
          
          // Поиск в любых элементах
          for (const el of Array.from(parent.querySelectorAll('*'))) {
            if (el.textContent && el.textContent.includes(textPart)) {
              return el.textContent;
            }
          }
          
          return '';
        };
        
        // Извлечение текста с ценой и площадью
        const priceText = findElementWithText(listing, 'zł');
        const areaText = findElementWithText(listing, 'm²');
        
        // Полный текст объявления для запасного варианта
        const fullText = listing.textContent || '';
        
        return { priceText, areaText, fullText };
      });
    }
  ).catch(error => {
    logError(`Error extracting listing data: ${error}`);
    return [];
  });
  
  logInfo(`Found ${listingsData.length} listings on page ${pageNum}`);
  
  // Обработка полученных данных
  for (let i = 0; i < listingsData.length; i++) {
    const item = listingsData[i];
    
    let finalPriceText = item.priceText;
    let finalAreaText = item.areaText;
    
    // Если не удалось найти данные стандартным способом,
    // пробуем извлечь из полного текста объявления
    if (!finalPriceText || !finalAreaText) {
      // Извлечение цены
      if (!finalPriceText) {
        const priceMatch = item.fullText.match(/(\d[\d\s]*[\d])\s*zł/i);
        if (priceMatch) {
          finalPriceText = priceMatch[0];
        }
      }
      
      // Извлечение площади
      if (!finalAreaText) {
        const areaMatch = item.fullText.match(/(\d[\d\s,.]*[\d])\s*m²/i);
        if (areaMatch) {
          finalAreaText = areaMatch[0];
        }
      }
    }
    
    // Если нашли оба значения, обрабатываем их
    if (finalPriceText && finalAreaText) {
      const price = parsePrice(finalPriceText);
      const area = parseArea(finalAreaText);
      
      if (price > 0 && area > 0) {
        // Расчет цены за квадратный метр
        const pricePerSqm = Math.round(price / area);
        
        // Добавляем данные в соответствующие массивы
        prices.push(price);
        areas.push(area);
        pricesPerSqm.push(pricePerSqm);
        
        logDebug(`Item ${i+1}: price=${price}, area=${area}, price/m²=${pricePerSqm}`);
      } else {
        logWarning(`Invalid values for item ${i+1}: price=${price}, area=${area}`);
      }
    } else {
      logWarning(`Missing data for item ${i+1}: price=${!!finalPriceText}, area=${!!finalAreaText}`);
    }
  }
  
  logInfo(`Successfully processed ${prices.length}/${listingsData.length} listings on page ${pageNum}`);
  
  return { prices, areas, pricesPerSqm };
}

/**
 * Обрабатывает первую страницу результатов поиска
 */
async function processFirstPage(
  page: Page
): Promise<{
  prices: number[];
  areas: number[];
  pricesPerSqm: number[];
  reportedCount: number;
}> {
  logInfo('Processing first page of results');
  
  // Извлекаем текст с количеством объявлений
  const countText = await page.textContent(
    '[data-cy="search.listing-panel.label.ads-number"], h1, .css-1j1z8qy, [data-cy="search-listing.status.header"]'
  ) || '';
  
  logInfo(`Count text: "${countText}"`);
  
  // Извлекаем количество объявлений
  const reportedCount = extractReportedCount(countText);
  logInfo(`Reported listings count: ${reportedCount}`);
  
  // Обрабатываем первую страницу
  const pageData = await processCurrentPage(page, 1);
  
  return { ...pageData, reportedCount };
}

/**
 * Переходит на следующую страницу результатов
 */
async function navigateToNextPage(page: Page, currentPageNum: number): Promise<boolean> {
  logInfo(`Attempting to navigate to page ${currentPageNum + 1}`);
  
  // Логируем текущий URL перед навигацией
  const currentUrl = page.url();
  logInfo(`Current URL before navigation: ${currentUrl}`);
  
  // Пробуем найти элементы пагинации с использованием разных селекторов
  const selectors = [
    '[data-cy="pagination.next-page"]',
    'nav button:last-child',
    'button[aria-label*="next"]',
    'a[href*="page="][rel="next"]',
    '.pagination-next',
    'nav li:last-child a',
    'button:has-text("Następna")'
  ];
  
  // Логируем найденные элементы пагинации
  let paginationElements: any[] = [];
  
  for (const selector of selectors) {
    const elements = await page.$$(selector);
    if (elements.length > 0) {
      logInfo(`Found ${elements.length} pagination elements using selector: ${selector}`);
      paginationElements = elements;
      break;
    }
  }
  
  if (paginationElements.length === 0) {
    logInfo('No pagination elements found, checking if there might be more pages');
    
    // Проверяем общее количество объявлений, возможно на странице не отображаются элементы пагинации,
    // но есть еще страницы (более 72 объявлений)
    const countText = await page.textContent('[data-cy="search.listing-panel.label"], .css-lm38vc, .listing-panel-header, h1 span') || '';
    const reportedCount = extractReportedCount(countText);
    
    if (reportedCount > 72 && currentPageNum === 1) {
      logInfo(`No pagination detected, but reportedCount ${reportedCount} suggests ~${Math.ceil(reportedCount/72)} pages`);
      
      // Пробуем напрямую перейти на следующую страницу
      const nextPageUrl = currentUrl.includes('?') 
        ? currentUrl + `&page=${currentPageNum + 1}` 
        : currentUrl + `?page=${currentPageNum + 1}`;
      
      logInfo(`Trying direct navigation to: ${nextPageUrl}`);
      
      try {
        await page.goto(nextPageUrl, { waitUntil: 'networkidle' });
        const newUrl = page.url();
        
        if (newUrl.includes(`page=${currentPageNum + 1}`)) {
          logInfo(`Found page ${currentPageNum + 1}`);
          return true;
        } else {
          logInfo(`Could not navigate to page ${currentPageNum + 1}`);
          return false;
        }
      } catch (error) {
        logError(`Error during direct navigation: ${error}`);
        return false;
      }
    }
    
    logInfo('Pagination elements not found, reached end of results');
    return false;
  }
  
  try {
    // Кликаем на кнопку следующей страницы
    logInfo('Clicking next page button');
    await paginationElements[0].click();
    
    // Дожидаемся загрузки страницы и появления элементов-объявлений
    await page.waitForLoadState('networkidle', { timeout: 15000 })
      .catch(e => logWarning(`Timeout in waitForLoadState: ${e}`));
    
    // Логируем URL после клика
    const afterClickUrl = page.url();
    logInfo(`URL after click: ${afterClickUrl}`);
    
    await page.waitForSelector(
      'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
      { timeout: 20000 }
    ).catch(e => logWarning(`Timeout waiting for listing elements: ${e}`));
    
    // Дополнительная задержка для стабилизации страницы
    await page.waitForTimeout(getRandomDelay(
      DELAYS.NAVIGATION.MIN_AFTER_PAGE_LOAD / 2,
      DELAYS.NAVIGATION.MAX_AFTER_PAGE_LOAD / 2
    ));
    
    // Проверка URL для подтверждения смены страницы
    const pageUrl = page.url();
    logInfo(`Final URL after navigation: ${pageUrl}`);
    
    const expectedPageParam = `page=${currentPageNum + 1}`;
    const pageNumberCheck = pageUrl.includes(expectedPageParam);
    
    if (!pageNumberCheck) {
      logWarning(`Page navigation may have failed. URL doesn't contain ${expectedPageParam}: ${pageUrl}`);
      
      // Дополнительная проверка на изменение содержимого
      // Проверяем любые элементы пагинации
      const paginationChecks = await page.$$('nav button, .pagination, [data-cy*="pagination"]');
      
      if (currentUrl !== pageUrl) {
        logInfo(`URL changed from ${currentUrl} to ${pageUrl}, considering navigation successful`);
        return true;
      }
      
      if (paginationChecks.length === 0) {
        // Проверка на антибот
        const botDetected = await checkForBotDetection(page);
        if (botDetected) {
          throw new Error('Bot detection triggered during pagination');
        }
        
        logWarning('Navigation failed - page content did not update');
        return false;
      }
    }
    
    logInfo(`Successfully navigated to page ${currentPageNum + 1}`);
    return true;
  } catch (error) {
    logError(`Error navigating to page ${currentPageNum + 1}: ${error}`);
    return false;
  }
}

/**
 * Функция для выполнения скрапинга с повторными попытками
 */
async function runWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = RETRY.MAX_RETRIES
): Promise<T> {
  let lastError;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      retryCount++;
      
      logWarning(`${operationName} failed (attempt ${retryCount}/${maxRetries}): ${error}`);
      
      if (retryCount >= maxRetries) {
        break;
      }
      
      // Экспоненциальная задержка между попытками
      const delay = DELAYS.RETRY.MIN_DELAY * Math.pow(DELAYS.RETRY.EXPONENTIAL_FACTOR, retryCount);
      const jitter = Math.random() * DELAYS.RETRY.MIN_DELAY;
      const totalDelay = Math.min(delay + jitter, DELAYS.RETRY.MAX_DELAY);
      
      logInfo(`Retrying after ${Math.round(totalDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw new Error(`${operationName} failed after ${maxRetries} attempts: ${lastError}`);
}

/**
 * Сохраняет результаты скрапинга в промежуточный файл
 */
function saveIntermediateResults(task: ScrapeTask, results: any): void {
  try {
    const filename = `${task.cityNormalized}_${task.districtSearchTerm}_${task.roomType}_${task.id}.json`;
    const filePath = path.join(RESULTS_DIR, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
    logDebug(`Saved intermediate results for task ${task.id} to ${filename}`);
  } catch (error) {
    logError(`Failed to save intermediate results: ${error}`);
  }
}

/**
 * Основная функция для скрапинга данных о недвижимости
 */
export async function scrapePropertyData(task: ScrapeTask): Promise<any> {
  
  logInfo(`Starting scrape task ${task.id}: ${task.cityNormalized}/${task.districtName}/${task.roomType}`);
  
  let localBrowser: Browser | null = null;
  let localContext: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // Проверяем состояние глобального браузера
    const isBrowserHealthy = browser ? await checkBrowserHealth() : false;
    
    if (!isBrowserHealthy) {
      logInfo('Browser needs initialization or restart');
      localBrowser = await initBrowser();
      localContext = await createContext(localBrowser);
    } else {
      logInfo('Reusing existing browser instance');
      localBrowser = browser!; // Утвердительное приведение типа, мы уже проверили что browser существует
      // Если существует глобальный контекст, используем его, иначе создаем новый
      if (context) {
        localContext = context;
      } else {
        localContext = await createContext(localBrowser);
      }
    }
    
    // Создаем новую страницу
    page = await localContext.newPage();
    await setupPage(page);
    
    // Конструируем URL для скрапинга
    const baseUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${task.cityUrl}/${task.districtSearchTerm}`;
    const roomTypeQuery = getRoomTypeQuery(task.roomType);
    const fullUrl = `${baseUrl}${roomTypeQuery}`;
    
    // Имитируем естественное поведение перед основным запросом
    await runWithRetry(
      () => simulateNaturalBrowsing(page!),
      'Natural browsing simulation'
    );
    
    // Переходим на страницу поиска
    logInfo(`Navigating to search URL: ${fullUrl}`);
    await runWithRetry(
      async () => {
        await page!.goto(fullUrl, { waitUntil: 'networkidle' });
        
        // Проверка на загрузку содержимого и антибот-защиту
        const hasListings = await page!.waitForSelector(
          'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
          { timeout: 15000 }
        ).then(() => true).catch(() => false);
        
        if (!hasListings) {
          const botDetected = await checkForBotDetection(page!);
          if (botDetected) {
            throw new Error('Bot detection triggered on search page');
          }
          
          throw new Error('No listing elements found on search page');
        }
        
        return true;
      },
      'Search page navigation'
    );
    
    // Иногда случайно посещаем объявление для имитации пользователя
    await visitRandomListing(page);
    
    // Обрабатываем первую страницу
    const { prices, areas, pricesPerSqm, reportedCount } = await runWithRetry(
      () => processFirstPage(page!),
      'First page processing'
    );
    
    // Инициализация счетчиков для пагинации
    let currentPage = 1;
    let consecutiveErrors = 0;
    
    // Определение максимального количества страниц
    // Если reportedCount > 0, вычисляем примерное количество страниц (72 объявления на страницу)
    const estimatedPages = reportedCount > 0 ? Math.ceil(reportedCount / 72) : 5;
    const maxPages = Math.min(estimatedPages, 20);
    
    logInfo(`Planning to process up to ${maxPages} pages (estimated from ${reportedCount} listings)`);
    
    // Промежуточные результаты первой страницы
    let results = {
      count: prices.length,
      reportedCount,
      avgPrice: calculateAverage(prices),
      avgPricePerSqm: calculateAverage(pricesPerSqm),
      prices,
      pricesPerSqm
    };
    
    // Сохраняем промежуточные результаты
    saveIntermediateResults(task, results);
    
    // Обрабатываем дополнительные страницы (не более maxPages)
    while (currentPage < maxPages && consecutiveErrors < RETRY.MAX_RETRIES) {
      // Проверяем состояние браузера и перезапускаем при необходимости
      if (!(await checkBrowserHealth())) {
        logInfo('Browser needs restart due to resource constraints');
        
        // Закрываем текущую страницу
        if (page) await page.close().catch(e => logError(`Error closing page: ${e}`));
        
        // Инициализируем заново
        localBrowser = await initBrowser();
        localContext = await createContext(localBrowser);
        page = await localContext.newPage();
        await setupPage(page);
        
        // Переходим сразу на нужную страницу пагинации
        const paginatedUrl = `${fullUrl}&page=${currentPage + 1}`;
        
        await runWithRetry(
          async () => {
            await page!.goto(paginatedUrl, { waitUntil: 'networkidle' });
            
            const hasListings = await page!.waitForSelector(
              'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
              { timeout: 15000 }
            ).then(() => true).catch(() => false);
            
            if (!hasListings) {
              throw new Error('No listing elements found after browser restart');
            }
            
            return true;
          },
          'Paginated page navigation after browser restart'
        );
      } else {
        // Переходим на следующую страницу
        const navigationSuccess = await runWithRetry(
          () => navigateToNextPage(page!, currentPage),
          `Navigation to page ${currentPage + 1}`,
          2 // Меньше попыток, возможно, нет следующей страницы
        ).catch(error => {
          logWarning(`Failed to navigate to next page: ${error}`);
          return false;
        });
        
        if (!navigationSuccess) {
          logInfo(`No more pages available after page ${currentPage}`);
          break;
        }
      }
      
      // Увеличиваем счетчик страниц
      currentPage++;
      
      try {
        // Иногда случайно посещаем объявление для имитации пользователя
        await visitRandomListing(page);
        
        // Обрабатываем текущую страницу
        const pageData = await runWithRetry(
          () => processCurrentPage(page!, currentPage),
          `Processing page ${currentPage}`
        );
        
        // Добавляем данные в общие массивы
        prices.push(...pageData.prices);
        areas.push(...pageData.areas);
        pricesPerSqm.push(...pageData.pricesPerSqm);
        
        // Обновляем результаты
        results = {
          count: prices.length,
          reportedCount,
          avgPrice: calculateAverage(prices),
          avgPricePerSqm: calculateAverage(pricesPerSqm),
          prices,
          pricesPerSqm
        };
        
        // Сохраняем промежуточные результаты
        saveIntermediateResults(task, results);
        
        // Сбрасываем счетчик ошибок
        consecutiveErrors = 0;
      } catch (error) {
        logError(`Error processing page ${currentPage}: ${error}`);
        consecutiveErrors++;
        
        if (consecutiveErrors >= RETRY.MAX_RETRIES) {
          logWarning(`Stopping pagination after ${consecutiveErrors} consecutive errors`);
          break;
        }
      }
      
      // Задержка между страницами
      const delay = getRandomDelay(
        DELAYS.ACTIONS.MIN_BETWEEN_PAGES,
        DELAYS.ACTIONS.MAX_BETWEEN_PAGES
      );
      logDebug(`Waiting ${delay}ms before next page`);
      await page.waitForTimeout(delay);
    }
    
    // Финальный расчет средних показателей
    const avgPrice = calculateAverage(prices);
    const avgPricePerSqm = calculateAverage(pricesPerSqm);
    
    // Подготовка финального результата
    const result = {
      count: prices.length,
      reportedCount,
      avgPrice,
      avgPricePerSqm,
      prices,
      pricesPerSqm
    };
    
    logInfo(`Scraping completed for ${task.districtName} (${task.roomType}): ${prices.length} listings found`);
    return result;
  } catch (error) {
    logError(`Critical error during scraping task ${task.id}: ${error}`);
    throw error;
  } finally {
    // Закрываем страницу
    if (page) {
      await page.close().catch(e => logError(`Error closing page: ${e}`));
    }
    
    // Логируем использование памяти
    logMemoryUsage();
    
    // Обновляем глобальные ссылки
    browser = localBrowser;
    context = localContext;
  }
}

// Регистрируем скрапер как обработчик задач
registerTaskProcessor(scrapePropertyData);

// Запускаем проверку памяти по интервалу
setInterval(() => {
  const memoryMb = getCurrentMemoryUsage();
  if (memoryMb > RESOURCE_LIMITS.MEMORY.WARNING_THRESHOLD) {
    logWarning(`Periodic memory check: High memory usage: ${memoryMb} MB`);
    if (memoryMb > RESOURCE_LIMITS.MEMORY.CRITICAL_THRESHOLD) {
      logWarning(`Critical memory threshold exceeded: ${memoryMb} MB. Restarting browser.`);
      closeBrowser().catch(e => logError(`Error closing browser during memory check: ${e}`));
    }
  }
}, RESOURCE_LIMITS.MEMORY.CHECK_INTERVAL);

// Экспортируем функции для внешнего использования
export {
  closeBrowser,
  checkBrowserHealth
};