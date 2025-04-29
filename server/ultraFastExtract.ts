/**
 * Ultra Fast Extract
 * 
 * Сверхлегкая версия скрапера, оптимизированная для максимальной скорости выполнения.
 * Исключает все необязательные операции и настройки.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Константы 
const MAX_RUNTIME = 20000; // 20 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если она не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Главная функция
async function ultraFastExtract() {
  console.log('=== STARTING ULTRA FAST EXTRACT ===');
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, MAX_RUNTIME);
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    // 1. Загружаем куки
    console.log('Loading cookies...');
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    
    // 2. Запускаем браузер с минимальными настройками
    console.log('Starting browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // 3. Создаем контекст и устанавливаем куки
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    await context.addCookies(sessionData.cookies);
    
    // 4. Создаем страницу и переходим по URL
    page = await context.newPage();
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    console.log(`Page loaded with status: ${response?.status()}`);
    
    // 5. Быстро проверяем на CloudFront блокировку
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // 6. Моментально запускаем извлечение данных
    console.log('Extracting data...');
    const data = await page.evaluate(() => {
      // Функции очистки и форматирования
      const cleanNumber = (text) => text?.replace(/[^\d.,]/g, '').replace(',', '.') || '0';
      
      // Поиск первого объявления
      const article = document.querySelector('article');
      if (!article) return { found: false };
      
      // Быстрое извлечение данных по селекторам
      const title = article.querySelector('h3')?.textContent?.trim() || 
                   article.querySelector('[data-cy="listing-item-title"]')?.textContent?.trim() || '';
                   
      const priceText = article.querySelector('[data-cy="listing-item-price"]')?.textContent?.trim() || 
                       article.querySelector('.css-s8lxhp')?.textContent?.trim() || '';
                       
      const areaText = article.querySelector('[data-cy="listing-item-area"]')?.textContent?.trim() || 
                      article.querySelector('span[aria-label*="area"]')?.textContent?.trim() || '';
                      
      const address = article.querySelector('[data-cy="listing-item-address"]')?.textContent?.trim() || 
                     article.querySelector('p')?.textContent?.trim() || '';
                     
      const url = article.querySelector('a')?.href || '';
      
      // Преобразование в числа
      const priceValue = parseInt(cleanNumber(priceText));
      const areaValue = parseFloat(cleanNumber(areaText));
      
      // Подсчет объявлений
      const totalArticles = document.querySelectorAll('article').length;
      
      return {
        found: true,
        totalArticles,
        title,
        price: {
          text: priceText,
          value: priceValue || 0
        },
        area: {
          text: areaText,
          value: areaValue || 0
        },
        pricePerSqm: {
          value: priceValue && areaValue ? Math.round(priceValue / areaValue) : 0
        },
        address,
        url
      };
    });
    
    // 7. Сохраняем результаты
    const resultsFile = path.join(RESULTS_DIR, `ultra_fast_extract_${Date.now()}.json`);
    
    if (data.found) {
      console.log(`\nFound ${data.totalArticles} listings`);
      console.log(`First listing: ${data.title}`);
      console.log(`Price: ${data.price.text}`);
      console.log(`Area: ${data.area.text}`);
      
      // Форматируем результат для сохранения
      const result = {
        status: 'success',
        timestamp: new Date().toISOString(),
        url: TARGET_URL,
        extractionTimeMs: Date.now() - startTime,
        data
      };
      
      fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
    } else {
      console.log('No listings found on the page');
      
      const result = {
        status: 'no_listings',
        timestamp: new Date().toISOString(),
        url: TARGET_URL,
        pageTitle,
        extractionTimeMs: Date.now() - startTime
      };
      
      fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
    }
    
    console.log(`Results saved to: ${resultsFile}`);
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    
    // Быстрое сохранение ошибки
    const errorFile = path.join(RESULTS_DIR, `ultra_fast_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      error: error.message,
      extractionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error saved to: ${errorFile}`);
  } finally {
    // Закрываем все ресурсы
    try {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    } catch (err) {
      console.log('Error during cleanup:', err.message);
    }
    
    clearTimeout(timeoutId);
    console.log(`Total execution time: ${Date.now() - startTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
}

// Запускаем скрапер и немедленно завершаем процесс
ultraFastExtract()
  .then(() => setTimeout(() => process.exit(0), 500))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });