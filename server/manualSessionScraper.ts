/**
 * Manual Session Scraper
 * 
 * Скрапер, использующий заранее сохраненные cookies и localStorage для 
 * обхода CloudFront защиты. Этот подход имитирует реальную уже авторизованную сессию.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, BrowserContext, Browser, Page } from 'playwright';

// Константы
const LOG_DIR = './logs/manual_session';
const TIMEOUT_MS = 60000; // 60 секунд на всё про всё
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie';

// Создаем директорию для логов
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Функция для логирования
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(LOG_DIR, 'log.txt'), logMessage + '\n');
}

// Функция для загрузки cookies и localStorage из файла
function loadSession(): { cookies: any[], localStorage: Record<string, string> } {
  try {
    const fileContent = fs.readFileSync(COOKIES_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to load session from file: ${error.message}`);
  }
}

// Основная функция скрапера
async function manualSessionScraper(): Promise<void> {
  log('=== STARTING MANUAL SESSION SCRAPER ===');
  
  // Глобальный таймаут
  const timeoutId = setTimeout(() => {
    log('⚠️ TIMEOUT: Global execution time exceeded');
    process.exit(1);
  }, TIMEOUT_MS);
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // 1. Загружаем данные сессии из файла
    log('Loading session data from file...');
    const { cookies, localStorage } = loadSession();
    log(`✓ Loaded ${cookies.length} cookies and ${Object.keys(localStorage).length} localStorage items`);
    
    // 2. Запускаем браузер с базовыми настройками для экономии ресурсов
    log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security', // Для обхода CORS при прямом доступе
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
      ],
      timeout: 30000
    });
    log('✓ Browser launched successfully');
    
    // 3. Создаем контекст с теми же параметрами, что были в оригинальной сессии
    log('Creating browser context with session parameters...');
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'Referer': 'https://www.otodom.pl/'
      }
    });
    log('✓ Context created');
    
    // 4. Добавляем cookies из файла
    log('Setting cookies from session file...');
    await context.addCookies(cookies);
    log('✓ Cookies set successfully');
    
    // 5. Создаем страницу и устанавливаем базовую защиту от обнаружения
    log('Creating page with anti-detection...');
    page = await context.newPage();
    
    // 6. Базовый скрипт анти-детекта (минимальная версия)
    await page.addInitScript(() => {
      // Маскируем webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Маскируем автоматизацию в WebGL
      if (typeof WebGLRenderingContext !== 'undefined') {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) return 'Intel Inc.';
          if (parameter === 37446) return 'Intel Iris OpenGL Engine';
          return getParameter.apply(this, arguments);
        };
      }
    });
    log('✓ Basic anti-detection applied');
    
    // 7. Устанавливаем localStorage из файла перед загрузкой страницы
    log('Setting up localStorage pre-navigation...');
    const localStorageScript = Object.entries(localStorage)
      .filter(([_, value]) => value !== null) // Фильтруем null значения
      .map(([key, value]) => `localStorage.setItem('${key}', '${value.replace(/'/g, "\\'")}');`)
      .join('\n');
    
    await page.addInitScript(`() => {
      ${localStorageScript}
    }`);
    log('✓ localStorage script prepared');
    
    // 8. Прямой переход на целевую страницу (без промежуточных шагов)
    log(`Navigating directly to target URL: ${TARGET_URL}`);
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    if (!response) {
      throw new Error('No response received from target URL');
    }
    
    log(`✓ Page loaded with status: ${response.status()}`);
    log(`Page title: ${await page.title()}`);
    
    // 9. Установка localStorage после загрузки страницы (на всякий случай)
    log('Setting localStorage post-navigation...');
    await page.evaluate((storageItems) => {
      for (const [key, value] of Object.entries(storageItems)) {
        if (value !== null) {
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            console.error(`Failed to set localStorage for ${key}:`, e);
          }
        }
      }
    }, localStorage);
    log('✓ localStorage items set');
    
    // 10. Сохраняем скриншот загруженной страницы
    const screenshotPath = path.join(LOG_DIR, 'results_page.png');
    await page.screenshot({ path: screenshotPath });
    log(`✓ Screenshot saved to: ${screenshotPath}`);
    
    // 11. Сохраняем HTML страницы для анализа
    const htmlPath = path.join(LOG_DIR, 'results_page.html');
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);
    log(`✓ HTML saved to: ${htmlPath}`);
    
    // 12. Проверяем на признаки блокировки CloudFront
    const isBlocked = html.includes('ERROR: The request could not be satisfied') || 
                    html.includes('Request blocked') ||
                    html.includes('Generated by cloudfront') ||
                    html.includes('Access Denied');
    
    if (isBlocked) {
      log('❌ BLOCKED: CloudFront protection detected!');
      // Сохраняем сообщение о блокировке
      fs.writeFileSync(path.join(LOG_DIR, 'cloudfront_block.txt'), 'CloudFront Block Detected');
    } else {
      log('✅ SUCCESS: No CloudFront blocking detected!');
    }
    
    // 13. Проверяем наличие элементов списка объявлений
    const listingData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const listingPanel = document.querySelector('[data-cy="search.listing-panel.label"]');
      
      // Проверка на блокировку
      const isBlocked = document.title.includes('ERROR') || 
                      document.body.innerText.includes('Request blocked');
      
      // Функция для чистки чисел
      const cleanNumber = (str) => {
        const cleaned = str.replace(/[^\d]/g, '');
        return cleaned ? parseInt(cleaned) : 0;
      };
      
      // Функция для чистки площади (с учетом запятой)
      const cleanArea = (str) => {
        const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.');
        return cleaned ? parseFloat(cleaned) : 0;
      };
      
      // Селекторы для цен
      const priceSelectors = [
        '[data-cy="listing-item-price"]',
        '.css-s8lxhp',
        '.e1jyrtvq0',
        'article .css-1mojcj4 span',
        'article span[data-testid]',
        'article span[aria-label*="price"]',
        'article .css-1956j2x'
      ];
      
      // Селекторы для площади
      const areaSelectors = [
        '[data-cy="listing-item-area"]',
        'article span[aria-label*="area"]',
        'article span[aria-label*="powierzchnia"]',
        'article .css-1dyvuwm'
      ];
      
      // Находим цены
      let prices = [];
      for (const selector of priceSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const foundPrices = Array.from(elements)
            .map(el => cleanNumber(el.textContent))
            .filter(price => price > 0);
          
          if (foundPrices.length > prices.length) {
            prices = foundPrices;
          }
        }
      }
      
      // Находим площади
      let areas = [];
      for (const selector of areaSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const foundAreas = Array.from(elements)
            .map(el => cleanArea(el.textContent))
            .filter(area => area > 0);
          
          if (foundAreas.length > areas.length) {
            areas = foundAreas;
          }
        }
      }
      
      return {
        isBlocked,
        articlesCount: articles.length,
        countText: listingPanel ? listingPanel.textContent : null,
        selectors: {
          priceResults: priceSelectors.map(selector => ({
            selector,
            count: document.querySelectorAll(selector).length
          })),
          areaResults: areaSelectors.map(selector => ({
            selector,
            count: document.querySelectorAll(selector).length
          }))
        },
        prices,
        areas,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    log(`Found ${listingData.articlesCount} article elements on page`);
    log(`Found ${listingData.prices.length} prices and ${listingData.areas.length} areas`);
    
    if (listingData.articlesCount > 0) {
      log('✅ SUCCESS: Listing elements found!');
    } else {
      log('⚠️ WARNING: No listing elements found. Might be blocked or different page structure.');
    }
    
    // 14. Сохраняем результаты в JSON
    const resultsPath = path.join(LOG_DIR, 'results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      url: listingData.url,
      isBlocked,
      articlesCount: listingData.articlesCount,
      countText: listingData.countText,
      selectors: listingData.selectors,
      prices: listingData.prices,
      areas: listingData.areas,
      pageTitle: listingData.pageTitle
    }, null, 2));
    
    log(`✓ Results saved to: ${resultsPath}`);
    
    // 15. Итоговый отчет
    log('\n=== SCRAPER RESULTS ===');
    log(`Target URL: ${TARGET_URL}`);
    log(`CloudFront blocked: ${isBlocked}`);
    log(`Articles found: ${listingData.articlesCount}`);
    log(`Prices found: ${listingData.prices.length}`);
    
    if (!isBlocked && listingData.articlesCount > 0) {
      log('VERDICT: SUCCESS! Successfully bypassed CloudFront protection using manual session');
    } else if (!isBlocked) {
      log('VERDICT: PARTIAL SUCCESS - Not blocked, but no listing elements found');
    } else {
      log('VERDICT: FAILURE - CloudFront protection still active');
    }
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    
    // Сохраняем стек ошибки
    fs.writeFileSync(
      path.join(LOG_DIR, 'error.txt'), 
      `${error.message}\n\n${error.stack || 'No stack trace available'}`
    );
    
    // Если страница доступна, делаем скриншот ошибки
    if (page) {
      try {
        const errorScreenshotPath = path.join(LOG_DIR, 'error.png');
        await page.screenshot({ path: errorScreenshotPath });
        log(`Error screenshot saved to: ${errorScreenshotPath}`);
      } catch (e) {
        log(`Failed to save error screenshot: ${e.message}`);
      }
    }
  } finally {
    // Очистка ресурсов
    clearTimeout(timeoutId);
    
    // Закрываем страницу
    if (page) {
      try {
        await page.close();
        log('Page closed');
      } catch (e) {
        log(`Error closing page: ${e.message}`);
      }
    }
    
    // Закрываем контекст
    if (context) {
      try {
        await context.close();
        log('Context closed');
      } catch (e) {
        log(`Error closing context: ${e.message}`);
      }
    }
    
    // Закрываем браузер
    if (browser) {
      try {
        await browser.close();
        log('Browser closed');
      } catch (e) {
        log(`Error closing browser: ${e.message}`);
      }
    }
    
    log('All resources cleaned up');
    log('=== SCRAPER FINISHED ===');
  }
}

// Запускаем скрапер
manualSessionScraper()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });