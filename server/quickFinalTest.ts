/**
 * Quick Final Test
 * 
 * Сокращенная версия финального скрапера для быстрого тестирования
 * в условиях ограниченных ресурсов Replit.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

// Константы
const LOG_DIR = './logs/quick_final';
const TIMEOUT_MS = 30000; // 30 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_DISTRICT = 'srodmiescie';
const TARGET_ROOMS = 'THREE'; // ONE, TWO, THREE, FOUR

// Создаем директорию для логов
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Функция для логирования
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(path.join(LOG_DIR, 'log.txt'), formattedMessage + '\n');
}

// Функция для загрузки cookies из файла
function loadSession(): { cookies: any[], localStorage: Record<string, string> } {
  try {
    const fileContent = fs.readFileSync(COOKIES_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to load session from file: ${error.message}`);
  }
}

// Основная функция скрапера
async function quickFinalTest(): Promise<void> {
  log('=== STARTING QUICK FINAL TEST ===');
  
  // Формируем целевой URL
  const targetUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${TARGET_DISTRICT}?roomsNumber=%5B${TARGET_ROOMS}%5D`;
  log(`Target URL: ${targetUrl}`);
  
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
    
    // 2. Запускаем браузер с оптимизированными настройками для Replit
    log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });
    log('✓ Browser launched');
    
    // 3. Создаем контекст
    log('Creating browser context...');
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw'
    });
    log('✓ Context created');
    
    // 4. Добавляем cookies из файла
    log('Setting cookies...');
    await context.addCookies(cookies);
    log('✓ Cookies set');
    
    // 5. Создаем страницу
    log('Creating page...');
    page = await context.newPage();
    log('✓ Page created');
    
    // 6. Устанавливаем localStorage до загрузки страницы
    log('Preparing localStorage script...');
    const localStorageScript = Object.entries(localStorage)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => `localStorage.setItem('${key}', '${String(value).replace(/'/g, "\\'")}');`)
      .join('\n');
    
    await page.addInitScript(`() => {
      ${localStorageScript}
    }`);
    log('✓ localStorage script prepared');
    
    // 7. Переходим на страницу
    log(`Navigating to ${targetUrl}...`);
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    if (response) {
      log(`✓ Page loaded with status: ${response.status()}`);
    } else {
      log('⚠️ No response received');
    }
    
    // 8. Устанавливаем localStorage после загрузки страницы
    log('Setting localStorage post-navigation...');
    await page.evaluate((storageItems) => {
      for (const [key, value] of Object.entries(storageItems)) {
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      }
    }, localStorage);
    log('✓ localStorage set successfully');
    
    // 9. Получаем заголовок страницы
    const pageTitle = await page.title();
    log(`Page title: ${pageTitle}`);
    
    // 10. Делаем скриншот страницы
    const screenshotPath = path.join(LOG_DIR, 'result.png');
    await page.screenshot({ path: screenshotPath });
    log(`✓ Screenshot saved to: ${screenshotPath}`);
    
    // 11. Сохраняем HTML страницы
    const htmlPath = path.join(LOG_DIR, 'result.html');
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
    } else {
      log('✅ SUCCESS: No CloudFront blocking detected!');
    }
    
    // 13. Извлекаем данные о недвижимости
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
    
    // 14. Итоговый отчет
    log('\n=== TEST RESULTS SUMMARY ===');
    log(`Target URL: ${targetUrl}`);
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
    clearTimeout(timeoutId);
    
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
}

// Запускаем скрапер
quickFinalTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });