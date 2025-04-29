/**
 * Enhanced Fast Test
 * 
 * Улучшенная версия быстрого теста с добавлением всех критических элементов,
 * необходимых для обхода защиты CloudFront.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

// Константы
const LOG_DIR = './logs/enhanced_test';
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D';

// Создаем директорию для логов
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Функция для логирования
function log(message: string): void {
  console.log(message);
  fs.appendFileSync(path.join(LOG_DIR, 'log.txt'), message + '\n');
}

// Основная функция
async function enhancedFastTest(): Promise<void> {
  log('=== STARTING ENHANCED FAST TEST ===');
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // 1. Загружаем данные сессии из файла
    log('Loading session data from file...');
    const fileContent = fs.readFileSync(COOKIES_FILE, 'utf-8');
    const { cookies, localStorage } = JSON.parse(fileContent);
    log(`Loaded ${cookies.length} cookies and ${Object.keys(localStorage).length} localStorage items`);
    
    // 2. Запускаем браузер с полными настройками
    log('Launching browser with optimized settings...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--window-size=1366,768'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 20000
    });
    log('✓ Browser launched successfully');
    
    // 3. Создаем контекст с полными настройками
    log('Creating optimized browser context...');
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      geolocation: { longitude: 21.0122, latitude: 52.2297 },
      viewport: { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'DNT': '1',
        'Referer': 'https://www.otodom.pl/'
      }
    });
    log('✓ Context created successfully');
    
    // 4. Добавляем cookies из файла
    log('Setting cookies from manual session...');
    await context.addCookies(cookies);
    log('✓ Cookies set successfully');
    
    // 5. Создаем страницу с антидетектом
    log('Creating stealth page...');
    page = await context.newPage();
    
    // 6. Добавляем продвинутый скрипт антидетекта
    await page.addInitScript(() => {
      // Webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Plugins и languages
      Object.defineProperty(navigator, 'plugins', { 
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
          ];
          
          plugins.__proto__ = {
            item: (index) => plugins[index],
            namedItem: (name) => plugins.find(p => p.name === name),
            refresh: () => {}
          };
          
          return plugins;
        },
        enumerable: true
      });
      
      Object.defineProperty(navigator, 'languages', { 
        get: () => ['pl-PL', 'pl', 'en-US', 'en'],
        enumerable: true
      });
      
      // Chrome automation props
      window.chrome = {
        app: {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
        },
        runtime: {
          OnInstalledReason: {},
          OnRestartRequiredReason: {},
          PlatformArch: {},
          PlatformOs: {}
        }
      };
    });
    log('✓ Enhanced anti-detection applied');
    
    // 7. Устанавливаем localStorage до загрузки страницы
    log('Preparing localStorage script...');
    const localStorageScript = Object.entries(localStorage)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => `localStorage.setItem('${key}', '${String(value).replace(/'/g, "\\'")}');`)
      .join('\n');
    
    await page.addInitScript(`() => {
      ${localStorageScript}
    }`);
    log('✓ localStorage script prepared');
    
    // 8. Переходим на целевую страницу
    log(`Navigating to ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    if (response) {
      log(`✓ Page loaded with status: ${response.status()}`);
    } else {
      log('⚠️ No response received');
    }
    
    // 9. Устанавливаем localStorage после загрузки страницы
    log('Setting localStorage post-navigation...');
    await page.evaluate((storageItems) => {
      for (const [key, value] of Object.entries(storageItems)) {
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      }
    }, localStorage);
    log('✓ localStorage set successfully');
    
    // 10. Получаем заголовок страницы
    const pageTitle = await page.title();
    log(`Page title: ${pageTitle}`);
    
    // 11. Делаем скриншот страницы
    const screenshotPath = path.join(LOG_DIR, 'result.png');
    await page.screenshot({ path: screenshotPath });
    log(`✓ Screenshot saved to: ${screenshotPath}`);
    
    // 12. Сохраняем HTML страницы
    const htmlPath = path.join(LOG_DIR, 'result.html');
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);
    log(`✓ HTML saved to: ${htmlPath}`);
    
    // 13. Проверяем на признаки блокировки CloudFront
    const isBlocked = html.includes('ERROR: The request could not be satisfied') || 
                     html.includes('Request blocked') ||
                     html.includes('Generated by cloudfront') ||
                     html.includes('Access Denied');
    
    if (isBlocked) {
      log('❌ BLOCKED: CloudFront protection detected!');
    } else {
      log('✅ SUCCESS: No CloudFront blocking detected!');
    }
    
    // 14. Извлекаем данные о недвижимости
    log('Extracting property data...');
    
    const scrapedData = await page.evaluate(() => {
      // Получаем количество объявлений
      const articles = document.querySelectorAll('article');
      
      // Получаем текст счетчика
      const countElement = document.querySelector('[data-cy="search.listing-panel.label"]');
      const countText = countElement ? countElement.textContent?.trim() : null;
      
      return {
        articlesCount: articles.length,
        countText
      };
    });
    
    log(`Found ${scrapedData.articlesCount} listings`);
    log(`Count text: ${scrapedData.countText || 'Not found'}`);
    
    // 15. Итоговый отчет
    log('\n=== TEST RESULTS SUMMARY ===');
    log(`Target URL: ${TARGET_URL}`);
    log(`Status code: ${response ? response.status() : 'unknown'}`);
    log(`CloudFront blocked: ${isBlocked}`);
    log(`Listings found: ${scrapedData.articlesCount}`);
    
    if (!isBlocked && scrapedData.articlesCount > 0) {
      log('✅ VERDICT: SUCCESS - Successfully bypassed CloudFront and loaded property listings!');
    } else if (!isBlocked) {
      log('⚠️ VERDICT: PARTIAL SUCCESS - Not blocked, but no listings found');
    } else {
      log('❌ VERDICT: FAILURE - CloudFront protection still active');
    }
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
  } finally {
    // Очистка ресурсов
    if (page) {
      try {
        await page.close();
        log('Page closed');
      } catch (e) {
        log(`Error closing page: ${e.message}`);
      }
    }
    
    if (context) {
      try {
        await context.close();
        log('Context closed');
      } catch (e) {
        log(`Error closing context: ${e.message}`);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
        log('Browser closed');
      } catch (e) {
        log(`Error closing browser: ${e.message}`);
      }
    }
    
    log('All resources cleaned up');
    log('=== TEST FINISHED ===');
  }
  
  // Принудительно завершаем процесс через минимальную задержку
  setTimeout(() => process.exit(0), 500);
}

// Запускаем тест
enhancedFastTest().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});