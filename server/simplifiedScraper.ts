/**
 * Simplified Scraper
 * 
 * Максимально упрощенная версия скрапера для быстрого извлечения информации
 * о текущих актуальных объявлениях на Otodom.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Константы
const MAX_RUNTIME = 20000; // 20 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
// Сразу ищем страницу с результатами поиска
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если она не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Упрощенная версия скрапера
 */
async function simplifiedScraper() {
  console.log('=== STARTING SIMPLIFIED SCRAPER ===');
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, MAX_RUNTIME);
  
  try {
    // 1. Загружаем данные сессии
    console.log('Loading cookies...');
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    
    // 2. Запускаем браузер
    console.log('Launching browser...');
    const browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // 3. Создаем контекст и устанавливаем куки
    console.log('Creating context and setting cookies...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    await context.addCookies(sessionData.cookies);
    
    // 4. Создаем страницу
    const page = await context.newPage();
    
    // 5. Переходим на страницу поиска
    console.log(`Navigating to ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log(`Page loaded with status: ${response?.status()}`);
    
    // 6. Сохраняем скриншот для проверки
    const screenshotPath = path.join(RESULTS_DIR, `simplified_screenshot_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // 7. Получаем текущие URL всех объявлений (это ссылки на актуальные объявления)
    console.log('Extracting listing URLs...');
    const listingUrls = await page.evaluate(() => {
      const urls: string[] = [];
      const links = document.querySelectorAll('article a[href*="/oferta/"]');
      links.forEach(link => {
        const url = (link as HTMLAnchorElement).href;
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      });
      return urls;
    });
    
    console.log(`Found ${listingUrls.length} listing URLs`);
    
    // 8. Сохраняем результаты
    const resultsFile = path.join(RESULTS_DIR, `simplified_urls_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      extractionTimeMs: Date.now() - startTime,
      totalUrls: listingUrls.length,
      urls: listingUrls
    }, null, 2));
    
    console.log(`Results saved to: ${resultsFile}`);
    
    if (listingUrls.length > 0) {
      // 9. Извлекаем базовую информацию о первом объявлении в списке
      const firstListingUrl = listingUrls[0];
      console.log(`Navigating to first listing: ${firstListingUrl}`);
      
      await page.goto(firstListingUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      // Сохраняем скриншот объявления
      const listingScreenshotPath = path.join(RESULTS_DIR, `first_listing_screenshot_${Date.now()}.png`);
      await page.screenshot({ path: listingScreenshotPath });
      console.log(`First listing screenshot saved to: ${listingScreenshotPath}`);
      
      // Извлекаем основную информацию
      const listingData = await page.evaluate(() => {
        // Заголовок
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        
        // Цена
        const priceText = document.querySelector('[data-cy="adPageHeaderPrice"], .css-8qi9av')?.textContent?.trim() || '';
        
        // Адрес
        const address = document.querySelector('[data-cy="adPageAdLocation"], .css-1l2t9ew')?.textContent?.trim() || '';
        
        // Изображение
        const imageUrl = (document.querySelector('[data-cy="galleryMainPhoto"] img') as HTMLImageElement)?.src || '';
        
        return {
          title,
          price: priceText,
          address,
          imageUrl,
          url: window.location.href
        };
      });
      
      // Сохраняем данные об объявлении
      const listingDataFile = path.join(RESULTS_DIR, `first_listing_data_${Date.now()}.json`);
      fs.writeFileSync(listingDataFile, JSON.stringify({
        status: 'success',
        timestamp: new Date().toISOString(),
        url: firstListingUrl,
        extractionTimeMs: Date.now() - startTime,
        data: listingData
      }, null, 2));
      
      console.log(`First listing data saved to: ${listingDataFile}`);
      console.log('\n=== FIRST LISTING DATA ===');
      console.log(`Title: ${listingData.title}`);
      console.log(`Price: ${listingData.price}`);
      console.log(`Address: ${listingData.address}`);
      console.log(`Image URL: ${listingData.imageUrl}`);
    }
    
    // 10. Закрываем ресурсы
    await page.close();
    await context.close();
    await browser.close();
    
  } catch (error) {
    console.error(`ERROR: ${(error as Error).message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `simplified_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      error: (error as Error).message,
      stack: (error as Error).stack,
      extractionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error information saved to: ${errorFile}`);
  } finally {
    clearTimeout(timeoutId);
    console.log(`Total execution time: ${Date.now() - startTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
}

// Запускаем скрапер
simplifiedScraper()
  .then(() => setTimeout(() => process.exit(0), 500))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });