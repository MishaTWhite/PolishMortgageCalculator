/**
 * Optimized Property Scraper
 * 
 * Оптимизированная версия скрапера для извлечения информации из одного объявления.
 * Используется упрощенный код для предотвращения ошибок при выполнении JavaScript.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Константы
const MAX_RUNTIME = 20000; // 20 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const URLS_FILE = './scraper_results/final_urls_1745938057085.json';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если она не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Основная функция скрапера
 */
async function optimizedPropertyScraper() {
  console.log('=== STARTING OPTIMIZED PROPERTY SCRAPER ===');
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, MAX_RUNTIME);
  
  let browser = null;
  
  try {
    // 1. Загружаем URL-адреса объявлений
    console.log('Loading property URLs...');
    const urlsData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
    const propertyUrls = urlsData.urls;
    
    console.log(`Loaded ${propertyUrls.length} property URLs`);
    
    // 2. Выбираем первый URL
    const targetUrl = propertyUrls[0];
    console.log(`Selected URL: ${targetUrl}`);
    
    // 3. Загружаем cookie
    console.log('Loading cookies...');
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    
    // 4. Запускаем браузер
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // 5. Создаем контекст и добавляем cookie
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    await context.addCookies(sessionData.cookies);
    
    // 6. Создаем страницу
    const page = await context.newPage();
    
    // 7. Переходим по URL объявления
    console.log(`Navigating to property listing: ${targetUrl}`);
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log(`Page loaded with status: ${response?.status()}`);
    
    // 8. Делаем скриншот страницы
    const screenshotPath = path.join(RESULTS_DIR, `optimized_screenshot_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // 9. Сохраняем HTML страницы для последующего анализа
    const htmlPath = path.join(RESULTS_DIR, `optimized_html_${Date.now()}.html`);
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);
    console.log(`HTML saved to: ${htmlPath}`);
    
    // 10. Используем простой JavaScript для извлечения данных
    console.log('Extracting property data...');
    
    // Заголовок объявления
    const title = await page.evaluate(() => {
      const titleElement = document.querySelector('h1');
      return titleElement ? titleElement.textContent.trim() : '';
    });
    
    // Цена объявления
    const price = await page.evaluate(() => {
      const priceElement = document.querySelector('[data-cy="adPageHeaderPrice"]') || 
                          document.querySelector('.css-8qi9av');
      return priceElement ? priceElement.textContent.trim() : '';
    });
    
    // Адрес объявления
    const address = await page.evaluate(() => {
      const addressElement = document.querySelector('[data-cy="adPageAdLocation"]') || 
                             document.querySelector('.css-1l2t9ew');
      return addressElement ? addressElement.textContent.trim() : '';
    });
    
    // URL изображения
    const imageUrl = await page.evaluate(() => {
      const imgElement = document.querySelector('[data-cy="galleryMainPhoto"] img') ||
                         document.querySelector('img[alt*="zdjęcie"]');
      return imgElement ? imgElement.getAttribute('src') : '';
    });
    
    // Извлечение параметров из свойств с использованием атрибутов
    // Выполняем несколько отдельных запросов JavaScript, чтобы снизить сложность
    
    // Площадь
    const area = await page.evaluate(() => {
      const areaElements = Array.from(document.querySelectorAll('div[role="row"]'));
      for (const element of areaElements) {
        const label = element.querySelector('div[role="cell"]:first-child');
        const value = element.querySelector('div[role="cell"]:last-child');
        
        if (label && value && 
            label.textContent && 
            (label.textContent.trim().includes('Powierzchnia') || 
             label.textContent.trim().includes('Area'))) {
          return value.textContent.trim();
        }
      }
      return '';
    });
    
    // Комнаты
    const rooms = await page.evaluate(() => {
      const roomElements = Array.from(document.querySelectorAll('div[role="row"]'));
      for (const element of roomElements) {
        const label = element.querySelector('div[role="cell"]:first-child');
        const value = element.querySelector('div[role="cell"]:last-child');
        
        if (label && value && 
            label.textContent && 
            (label.textContent.trim().includes('Liczba pokoi') || 
             label.textContent.trim().includes('Rooms'))) {
          return value.textContent.trim();
        }
      }
      return '';
    });
    
    // Этаж
    const floor = await page.evaluate(() => {
      const floorElements = Array.from(document.querySelectorAll('div[role="row"]'));
      for (const element of floorElements) {
        const label = element.querySelector('div[role="cell"]:first-child');
        const value = element.querySelector('div[role="cell"]:last-child');
        
        if (label && value && 
            label.textContent && 
            (label.textContent.trim().includes('Piętro') || 
             label.textContent.trim().includes('Floor'))) {
          return value.textContent.trim();
        }
      }
      return '';
    });
    
    // 11. Структурируем и выводим данные
    const propertyData = {
      title,
      price,
      address,
      area,
      rooms,
      floor,
      imageUrl,
      url: targetUrl
    };
    
    console.log('\n=== EXTRACTED PROPERTY DATA ===');
    console.log(`Title: ${propertyData.title}`);
    console.log(`Price: ${propertyData.price}`);
    console.log(`Address: ${propertyData.address}`);
    console.log(`Area: ${propertyData.area}`);
    console.log(`Rooms: ${propertyData.rooms}`);
    console.log(`Floor: ${propertyData.floor}`);
    console.log(`Image URL: ${propertyData.imageUrl}`);
    
    // 12. Сохраняем результаты
    const resultsFile = path.join(RESULTS_DIR, `optimized_data_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      url: targetUrl,
      executionTimeMs: Date.now() - startTime,
      data: propertyData
    }, null, 2));
    
    console.log(`\nResults saved to: ${resultsFile}`);
    
    // 13. Закрываем ресурсы
    await page.close();
    await context.close();
    await browser.close();
    browser = null;
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `optimized_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
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

// Запускаем скрапер
optimizedPropertyScraper()
  .then(() => setTimeout(() => process.exit(0), 100))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });