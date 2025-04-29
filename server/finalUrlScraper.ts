/**
 * Final URL Scraper
 * 
 * Максимально оптимизированная версия скрапера для быстрого извлечения URL-адресов 
 * объявлений без какой-либо обработки данных. Фокусируется исключительно на производительности.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Константы
const MAX_RUNTIME = 15000; // 15 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
// Сразу ищем страницу с результатами поиска
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/wola';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если она не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Быстрый скрапер URL-адресов
 */
async function finalUrlScraper() {
  console.log('=== STARTING FINAL URL SCRAPER ===');
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, MAX_RUNTIME);
  
  let browser = null;
  
  try {
    // 1. Запускаем браузер с минимальными настройками
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // 2. Создаем контекст и страницу
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    
    // 3. Устанавливаем cookies
    console.log('Setting cookies...');
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    await context.addCookies(sessionData.cookies);
    
    // 4. Создаем страницу
    const page = await context.newPage();
    
    // 5. Переходим на страницу поиска
    console.log(`Navigating to ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    console.log(`Page loaded with status: ${response?.status()}`);
    
    // 6. Быстро извлекаем все URL-адреса
    console.log('Extracting URLs...');
    const urls = await page.evaluate(() => {
      const listingUrls = [];
      const links = document.querySelectorAll('a[href*="/oferta/"]');
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        if (href && href.includes('/oferta/') && !listingUrls.includes(href)) {
          listingUrls.push(href);
        }
      }
      return listingUrls;
    });
    
    console.log(`Found ${urls.length} property URLs`);
    
    // 7. Сохраняем результаты
    const resultsFile = path.join(RESULTS_DIR, `final_urls_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      searchUrl: TARGET_URL,
      executionTimeMs: Date.now() - startTime,
      totalUrls: urls.length,
      urls: urls,
      firstUrls: urls.slice(0, 5) // Первые 5 URL для примера
    }, null, 2));
    
    console.log(`Results saved to: ${resultsFile}`);
    
    // 8. Получаем заголовок страницы
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // 9. Делаем скриншот для проверки
    const screenshotPath = path.join(RESULTS_DIR, `final_screenshot_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // 10. Быстро закрываем ресурсы
    await context.close();
    await browser.close();
    browser = null;
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `final_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      error: error.message,
      executionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error saved to: ${errorFile}`);
  } finally {
    // Закрываем браузер, если он все еще открыт
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.log('Error closing browser:', e.message);
      }
    }
    
    clearTimeout(timeoutId);
    console.log(`Total execution time: ${Date.now() - startTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
}

// Запускаем скрапер и немедленно завершаем процесс
finalUrlScraper()
  .then(() => setTimeout(() => process.exit(0), 100))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });