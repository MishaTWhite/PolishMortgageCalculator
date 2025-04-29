// Test Single Task Scraper
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

interface ScraperResult {
  timestamp: string;
  url?: string;
  success: boolean;
  errorMessage?: string;
  district?: string;
  roomsType?: string;
  pricesCount?: number;
  prices?: number[];
  areas?: number[];
  pricesPerSqm?: number[];
  averagePrice?: number;
  averagePricePerSqm?: number;
  listingCount?: string | number;
  diagData?: any;
}

// Константы и параметры
const TIMEOUT_MS = 80000; // 80 секунд таймаут для всего скрапинга (уменьшен для ускорения тестов)
const TASK_ID = 'test_task2';
const TASK_DISTRICT = 'Śródmieście';
const TASK_ROOMS = 'threeRoom';
const LOGS_DIR = './logs';

// Создаем директорию для логов, если её нет
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Основная функция тестового скрапера
 */
async function testSingleTask(): Promise<ScraperResult> {
  // Создаем подпапку для конкретного задания
  const taskDir = path.join(LOGS_DIR, TASK_ID);
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }
  
  // Сохраняем результаты в отдельный файл
  const logFilePath = path.join(taskDir, 'log.txt');
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  
  // Функция для логирования
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
    logStream.write(formattedMessage + '\n');
  };
  
  // Стартовый лог
  log(`========== STARTING TEST TASK: ${TASK_DISTRICT}/${TASK_ROOMS} ==========`);
  log(`Memory at start: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // Устанавливаем таймаут для всей операции
    const timeoutId = setTimeout(() => {
      log('CRITICAL ERROR: Global timeout reached, killing process');
      logStream.end();
      process.exit(1);
    }, TIMEOUT_MS);
    
    // Создаем объект для сбора диагностической информации
    const diagData: Record<string, any> = {
      system: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        totalMem: Math.round(os.totalmem() / 1024 / 1024),
        freeMem: Math.round(os.freemem() / 1024 / 1024),
        cpus: os.cpus().length,
      },
      timing: {
        start: new Date().toISOString(),
        browserLaunch: null,
        mainPageLoad: null,
        resultsPageLoad: null,
        dataExtraction: null,
        end: null
      },
      screenshots: [],
      errors: []
    };
    
    // 1. Инициализация браузера
    log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-dev-shm-usage',
      ],
      timeout: 30000
    });
    diagData.timing.browserLaunch = new Date().toISOString();
    log('Browser launched successfully');
    
    // 2. Создаем контекст браузера с реалистичными параметрами
    log('Creating browser context...');
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      geolocation: { longitude: 21.0122, latitude: 52.2297 },
      permissions: ['geolocation'],
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-site': 'none',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'upgrade-insecure-requests': '1',
        'DNT': '1',
        'Sec-GPC': '1',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive'
      }
    });
    log('Browser context created successfully');
    
    // 3. Создаем новую страницу и настраиваем обход защиты
    log('Creating new page with stealth scripts...');
    page = await context.newPage();
    
    // Добавляем скрипт для обхода детекции автоматизации
    await page.addInitScript(() => {
      // Маскируем navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Добавляем типичные плагины браузера
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ]
      });
      
      // Имитируем языки
      Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'pl', 'en-US', 'en'] });
      
      // Реалистичные характеристики аппаратного обеспечения
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      
      // Маскируем WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel HD Graphics';
        return getParameter.apply(this, arguments);
      };
    });
    log('Anti-detection scripts applied');
    
    // 4. Устанавливаем cookie для обхода баннера согласия
    log('Setting cookies to bypass consent banner...');
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 7
      },
      {
        name: 'OptanonConsent',
        value: 'isIABGlobal=false&datestamp=Mon+Apr+29+2024+08%3A05%3A54+GMT%2B0000&version=202209.1.0&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0&geolocation=PL%3B14&AwaitingReconsent=false',
        domain: '.otodom.pl',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 7
      }
    ]);
    log('Cookies set successfully');
    
    // 5. Загружаем главную страницу и делаем скриншот
    log('Loading main page...');
    const mainPageResponse = await page.goto('https://www.otodom.pl/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    if (!mainPageResponse) {
      throw new Error('Failed to load main page: No response received');
    }
    
    log(`Main page loaded with status: ${mainPageResponse.status()}`);
    diagData.timing.mainPageLoad = new Date().toISOString();
    
    // Делаем скриншот главной страницы
    const mainPageScreenshotPath = path.join(taskDir, 'main_page.png');
    await page.screenshot({ path: mainPageScreenshotPath });
    diagData.screenshots.push({ type: 'main_page', path: mainPageScreenshotPath });
    log(`Main page screenshot saved to: ${mainPageScreenshotPath}`);
    
    // Эмулируем поведение человека: случайные скроллы
    log('Simulating human behavior...');
    await simulateHumanBehavior(page);
    
    // 6. Переходим к результатам поиска
    // Сначала переходим на промежуточные страницы для более реалистичного поведения
    log('Navigating to intermediate pages to establish referrer chain...');
    
    // Переход на страницу продаж с задержкой
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/'
    });
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 500));
    
    // Эмулируем скроллинг и движения мыши
    await simulateHumanBehavior(page);
    
    // Переход на страницу квартир с задержкой
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/pl/oferty/sprzedaz'
    });
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 500));
    
    // Эмулируем скроллинг и движения мыши
    await simulateHumanBehavior(page);
    
    // Переход на страницу Варшавы с задержкой
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie'
    });
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 500));
    
    // Эмулируем скроллинг и движения мыши
    await simulateHumanBehavior(page);
    
    // Формируем целевой URL
    let roomFilter = 'THREE';
    switch (TASK_ROOMS) {
      case 'oneRoom':
        roomFilter = 'ONE';
        break;
      case 'twoRoom':
        roomFilter = 'TWO';
        break;
      case 'threeRoom':
        roomFilter = 'THREE';
        break;
      case 'fourPlusRoom':
        roomFilter = 'FOUR';
        break;
    }
    
    const targetUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${TASK_DISTRICT.toLowerCase()}?roomsNumber=%5B${roomFilter}%5D`;
    log(`Target URL: ${targetUrl}`);
    
    // 7. Выполняем финальный переход с задержкой
    log('Loading results page...');
    const resultsPageResponse = await page.goto(targetUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000,
      referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa'
    });
    
    if (!resultsPageResponse) {
      throw new Error('Failed to load results page: No response received');
    }
    
    log(`Results page loaded with status: ${resultsPageResponse.status()}`);
    diagData.timing.resultsPageLoad = new Date().toISOString();
    
    // 8. Делаем скриншот страницы с результатами
    const resultsPageScreenshotPath = path.join(taskDir, 'results_page.png');
    await page.screenshot({ path: resultsPageScreenshotPath });
    diagData.screenshots.push({ type: 'results_page', path: resultsPageScreenshotPath });
    log(`Results page screenshot saved to: ${resultsPageScreenshotPath}`);
    
    // 9. Сохраняем HTML страницы для анализа
    const pageContent = await page.content();
    const htmlPath = path.join(taskDir, 'results_page.html');
    fs.writeFileSync(htmlPath, pageContent);
    log(`Results page HTML saved to: ${htmlPath}`);
    
    // 10. Проверяем на наличие блокировки CloudFront
    const isBlocked = pageContent.includes('ERROR: The request could not be satisfied') || 
                     pageContent.includes('Request blocked') ||
                     pageContent.includes('Generated by cloudfront');
    
    if (isBlocked) {
      log('❌ WARNING: CloudFront blocking detected!');
      diagData.cloudFrontBlocked = true;
      // Сохраняем информацию о блокировке
      const blockInfoPath = path.join(taskDir, 'cloudfront_block.txt');
      fs.writeFileSync(blockInfoPath, pageContent);
      
      // Можно вернуть ошибку, но пока попробуем продолжить
      log('Attempting to continue with extraction despite possible blocking...');
    } else {
      log('✓ No CloudFront blocking detected');
      diagData.cloudFrontBlocked = false;
    }
    
    // 11. Извлекаем данные
    log('Extracting property data...');
    diagData.timing.dataExtraction = new Date().toISOString();
    
    const data = await page.evaluate(() => {
      // Проверяем на блокировку
      if (document.title.includes('ERROR') || document.body.innerText.includes('Request blocked')) {
        return { blocked: true, prices: [], areas: [] };
      }
      
      const articles = document.querySelectorAll('article');
      const countEl = document.querySelector('[data-cy="search.listing-panel.label"]');
      const count = countEl ? countEl.textContent : null;
      
      // Разные селекторы для цен
      const priceSelectors = [
        '[data-cy="listing-item-price"]',
        '.css-s8lxhp',
        '.e1jyrtvq0',
        'article .css-1mojcj4 span',
        'article span[data-testid]',
        'article span[aria-label*="price"]'
      ];
      
      // Разные селекторы для площади
      const areaSelectors = [
        '[data-cy="listing-item-area"]',
        'article span[aria-label*="area"]',
        'article span[aria-label*="powierzchnia"]'
      ];
      
      // Извлекаем информацию по разным селекторам
      const selectorResults: Record<string, any> = {};
      let prices: string[] = [];
      let areas: string[] = [];
      
      // Проверяем селекторы для цен
      for (const selector of priceSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          selectorResults[selector] = elements.length;
          
          if (elements.length > 0) {
            const extractedPrices = Array.from(elements).map(el => {
              const text = el.textContent || '';
              return text.replace(/[^\d]/g, '');
            }).filter(p => p.length > 0);
            
            if (extractedPrices.length > prices.length) {
              prices = extractedPrices;
            }
          }
        } catch (e) {
          selectorResults[selector] = `Error: ${(e as Error).message}`;
        }
      }
      
      // Проверяем селекторы для площади
      for (const selector of areaSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          selectorResults[selector + '_count'] = elements.length;
          
          if (elements.length > 0) {
            const extractedAreas = Array.from(elements).map(el => {
              const text = el.textContent || '';
              return text.replace(/[^\d,\.]/g, '').replace(',', '.');
            }).filter(a => a.length > 0);
            
            if (extractedAreas.length > areas.length) {
              areas = extractedAreas;
            }
          }
        } catch (e) {
          selectorResults[selector] = `Error: ${(e as Error).message}`;
        }
      }
      
      // Сохраняем дополнительную информацию о странице
      const pageInfo = {
        title: document.title,
        url: window.location.href,
        metadata: {}
      };
      
      // Собираем метаданные
      try {
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(tag => {
          const name = tag.getAttribute('name') || tag.getAttribute('property');
          const content = tag.getAttribute('content');
          if (name && content) {
            pageInfo.metadata[name] = content;
          }
        });
      } catch (e) {
        pageInfo.metadataError = (e as Error).message;
      }
      
      return {
        blocked: false,
        count,
        articlesCount: articles.length,
        prices,
        areas,
        selectorResults,
        pageInfo
      };
    });
    
    log(`Extracted data: ${data.prices?.length || 0} prices, ${data.areas?.length || 0} areas`);
    
    // 12. Обрабатываем и анализируем извлеченные данные
    let pricesNum: number[] = [];
    let areasNum: number[] = [];
    let pricesPerSqm: number[] = [];
    
    if (data.prices && data.prices.length > 0) {
      pricesNum = data.prices.map(price => parseInt(price, 10)).filter(p => !isNaN(p));
    }
    
    if (data.areas && data.areas.length > 0) {
      areasNum = data.areas.map(area => parseFloat(area)).filter(a => !isNaN(a));
    }
    
    // Рассчитываем цены за кв.м.
    if (pricesNum.length === areasNum.length && pricesNum.length > 0) {
      pricesPerSqm = pricesNum.map((price, i) => Math.round(price / areasNum[i]));
    }
    
    // Рассчитываем средние значения
    const averagePrice = pricesNum.length > 0 
      ? Math.round(pricesNum.reduce((sum, price) => sum + price, 0) / pricesNum.length) 
      : undefined;
    
    const averagePricePerSqm = pricesPerSqm.length > 0 
      ? Math.round(pricesPerSqm.reduce((sum, price) => sum + price, 0) / pricesPerSqm.length) 
      : undefined;
    
    log(`Average price: ${averagePrice}, Average price per sqm: ${averagePricePerSqm}`);
    
    // 13. Формируем результаты
    diagData.timing.end = new Date().toISOString();
    
    const result: ScraperResult = {
      timestamp: new Date().toISOString(),
      url: targetUrl,
      success: true,
      district: TASK_DISTRICT,
      roomsType: TASK_ROOMS,
      pricesCount: pricesNum.length,
      prices: pricesNum,
      areas: areasNum,
      pricesPerSqm,
      averagePrice,
      averagePricePerSqm,
      listingCount: data.count || data.articlesCount,
      diagData
    };
    
    // 14. Сохраняем полные результаты
    const resultPath = path.join(taskDir, 'results.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    log(`Results saved to: ${resultPath}`);
    
    // 15. Чистим ресурсы и возвращаем результат
    clearTimeout(timeoutId);
    log(`========== TEST TASK COMPLETED SUCCESSFULLY ==========`);
    return result;
    
  } catch (error) {
    const errorMessage = (error as Error).message || String(error);
    log(`❌ ERROR: ${errorMessage}`);
    log(JSON.stringify((error as Error).stack || ''));
    
    // Пытаемся сделать скриншот ошибки, если страница доступна
    if (page) {
      try {
        const errorScreenshotPath = path.join(taskDir, 'error_screenshot.png');
        await page.screenshot({ path: errorScreenshotPath });
        log(`Error screenshot saved to: ${errorScreenshotPath}`);
      } catch (e) {
        log(`Failed to capture error screenshot: ${e}`);
      }
    }
    
    // Возвращаем ошибку
    const result: ScraperResult = {
      timestamp: new Date().toISOString(),
      success: false,
      errorMessage,
      district: TASK_DISTRICT,
      roomsType: TASK_ROOMS,
      diagData: {
        error: errorMessage,
        stack: (error as Error).stack,
        timing: {
          end: new Date().toISOString()
        }
      }
    };
    
    log(`========== TEST TASK FAILED ==========`);
    return result;
    
  } finally {
    // Закрываем страницу, контекст и браузер
    log('Cleaning up resources...');
    
    if (page) {
      try {
        await page.close();
        log('Page closed');
      } catch (e) {
        log(`Error closing page: ${e}`);
      }
    }
    
    if (context) {
      try {
        await context.close();
        log('Context closed');
      } catch (e) {
        log(`Error closing context: ${e}`);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
        log('Browser closed');
      } catch (e) {
        log(`Error closing browser: ${e}`);
      }
    }
    
    logStream.end();
    log(`Memory at end: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
  }
}

/**
 * Имитирует поведение реального пользователя: случайные движения мыши,
 * скроллинг и паузы между действиями
 */
async function simulateHumanBehavior(page: Page): Promise<void> {
  try {
    console.log('Simulating human behavior...');
    
    // Случайное количество действий от 2 до 5
    const actionsCount = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < actionsCount; i++) {
      // Выбираем случайное действие
      const actionType = Math.floor(Math.random() * 3);
      
      switch (actionType) {
        case 0:
          // Движение мыши к случайной точке
          const x = 100 + Math.floor(Math.random() * 600);
          const y = 100 + Math.floor(Math.random() * 400);
          await page.mouse.move(x, y);
          break;
          
        case 1:
          // Скролл вниз
          const scrollDownDistance = 100 + Math.floor(Math.random() * 300);
          await page.evaluate((distance) => {
            window.scrollBy(0, distance);
          }, scrollDownDistance);
          break;
          
        case 2:
          // Скролл вверх (если не в начале страницы)
          const scrollUpDistance = Math.floor(Math.random() * 150);
          await page.evaluate((distance) => {
            if (window.scrollY > distance) {
              window.scrollBy(0, -distance);
            }
          }, scrollUpDistance);
          break;
      }
      
      // Пауза между действиями (более короткая)
      const pauseDuration = 200 + Math.floor(Math.random() * 400);
      await page.waitForTimeout(pauseDuration);
    }
    
    console.log(`✓ Simulated ${actionsCount} human-like actions`);
  } catch (error) {
    console.log(`Error in human behavior simulation: ${error}`);
  }
}

// Запускаем тестовую задачу
testSingleTask()
  .then(result => {
    console.log('Test task completed with result:', 
      result.success 
        ? `SUCCESS! Found ${result.pricesCount} prices, average: ${result.averagePrice} PLN` 
        : `FAILED: ${result.errorMessage}`
    );
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error in test task:', err);
    process.exit(1);
  });