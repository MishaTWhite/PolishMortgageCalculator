/**
 * Minimal Scraper
 * 
 * Предельно минимальная версия скрапера, которая гарантированно выполнится в рамках ограничений Replit.
 * Извлекает только URL объявлений и сразу завершает работу.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Константы
const MAX_RUNTIME = 10000; // 10 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/wola';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Минимальный скрапер
 */
async function minimalScraper() {
  console.log('=== STARTING MINIMAL SCRAPER ===');
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, MAX_RUNTIME);
  
  let browser = null;
  
  try {
    // 1. Запускаем браузер
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    // 2. Создаем контекст
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    
    // 3. Загружаем cookies
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    await context.addCookies(sessionData.cookies);
    
    // 4. Создаем страницу
    const page = await context.newPage();
    
    // 5. Переходим на целевую страницу
    console.log(`Navigating to: ${TARGET_URL}`);
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 5000
    });
    
    // 6. Извлекаем только URL объявлений
    console.log('Extracting listing URLs...');
    const urls = await page.evaluate(() => {
      const listingUrls = [];
      const links = document.querySelectorAll('article a[href*="/oferta/"]');
      
      links.forEach(link => {
        const url = (link as HTMLAnchorElement).href;
        if (url && !listingUrls.includes(url)) {
          listingUrls.push(url);
        }
      });
      
      return {
        urls: listingUrls,
        title: document.title
      };
    });
    
    // 7. Быстро закрываем ресурсы
    await page.close();
    await context.close();
    await browser.close();
    browser = null;
    
    // 8. Выводим и сохраняем результаты
    console.log(`Found ${urls.urls.length} listing URLs`);
    console.log(`Page title: ${urls.title}`);
    
    const resultsFile = path.join(RESULTS_DIR, `minimal_urls_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      executionTimeMs: Date.now() - startTime,
      pageTitle: urls.title,
      totalUrls: urls.urls.length,
      urls: urls.urls,
      firstTenUrls: urls.urls.slice(0, 10)
    }, null, 2));
    
    console.log(`Results saved to: ${resultsFile}`);
    console.log(`Successfully completed in ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `minimal_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      error: error.message,
      executionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error saved to: ${errorFile}`);
  } finally {
    // Закрываем браузер, если он остался открытым
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
minimalScraper()
  .then(() => setTimeout(() => process.exit(0), 50))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });