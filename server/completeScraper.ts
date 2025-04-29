/**
 * Complete Scraper
 * 
 * Завершающая версия скрапера, которая использует все ключевые техники:
 * 1. Быстрое извлечение URL объявлений через Playwright с session hijacking
 * 2. Сохранение найденных URL в файл
 * 3. Не пытается получить все данные за один раз
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Константы
const MAX_RUNTIME = 15000; // 15 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/wola';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Основная функция скрапера
 */
async function completeScraper() {
  console.log('=== STARTING COMPLETE SCRAPER ===');
  
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
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // 2. Создаем контекст и загружаем сессию
    console.log('Setting up session...');
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
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    console.log(`Page loaded with status: ${response?.status()}`);
    
    // 6. Делаем скриншот для проверки
    const screenshotPath = path.join(RESULTS_DIR, `complete_screenshot_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // 7. Извлекаем URL объявлений
    console.log('Extracting listing URLs...');
    const urls = await page.evaluate(() => {
      const result = {
        urls: [] as string[],
        count: null as string | null,
        title: document.title
      };
      
      // Извлекаем URL объявлений
      const links = document.querySelectorAll('article a[href*="/oferta/"]');
      links.forEach(link => {
        const url = (link as HTMLAnchorElement).href;
        if (url && !result.urls.includes(url)) {
          result.urls.push(url);
        }
      });
      
      // Извлекаем общее количество объявлений
      const countElement = document.querySelector('[data-cy="search.listing-panel.label"]');
      result.count = countElement ? countElement.textContent?.trim() : null;
      
      return result;
    });
    
    console.log(`Found ${urls.urls.length} listing URLs`);
    console.log(`Page title: ${urls.title}`);
    console.log(`Listing count text: ${urls.count || 'Not found'}`);
    
    // 8. Сохраняем результаты
    const resultsFile = path.join(RESULTS_DIR, `complete_urls_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      executionTimeMs: Date.now() - startTime,
      pageTitle: urls.title,
      count: urls.count,
      totalUrls: urls.urls.length,
      urls: urls.urls,
      firstFiveUrls: urls.urls.slice(0, 5)
    }, null, 2));
    
    console.log(`Results saved to: ${resultsFile}`);
    
    // 9. Извлекаем дополнительную информацию о первых двух объявлениях
    if (urls.urls.length >= 2) {
      console.log('\nGathering minimal data about first two listings...');
      
      const listingsData = [];
      
      for (let i = 0; i < 2 && i < urls.urls.length; i++) {
        const listingUrl = urls.urls[i];
        console.log(`Processing URL ${i+1}: ${listingUrl}`);
        
        // Переходим на страницу объявления
        await page.goto(listingUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 5000 // Короткий таймаут для каждого объявления
        });
        
        // Быстро извлекаем только основные данные
        const basicData = await page.evaluate(() => {
          return {
            title: document.querySelector('h1')?.textContent?.trim() || '',
            price: document.querySelector('[data-cy="adPageHeaderPrice"]')?.textContent?.trim() || '',
            address: document.querySelector('[data-cy="adPageAdLocation"]')?.textContent?.trim() || ''
          };
        });
        
        console.log(`- Title: ${basicData.title}`);
        console.log(`- Price: ${basicData.price}`);
        
        listingsData.push({
          url: listingUrl,
          ...basicData
        });
      }
      
      // Сохраняем минимальные данные о первых двух объявлениях
      const listingsFile = path.join(RESULTS_DIR, `complete_listings_${Date.now()}.json`);
      fs.writeFileSync(listingsFile, JSON.stringify({
        status: 'success',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        count: listingsData.length,
        listings: listingsData
      }, null, 2));
      
      console.log(`Basic listing data saved to: ${listingsFile}`);
    }
    
    // 10. Закрываем ресурсы
    await page.close();
    await context.close();
    await browser.close();
    browser = null;
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `complete_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      error: error.message,
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error information saved to: ${errorFile}`);
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

// Запускаем скрапер
completeScraper()
  .then(() => setTimeout(() => process.exit(0), 100))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });