/**
 * Final Scraper
 * 
 * Финальная оптимизированная версия скрапера для извлечения данных с Otodom.
 * Комбинирует все лучшие практики и обходные пути, найденные в предыдущих версиях.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

// Константы
const MAX_RUNTIME = 25000; // 25 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/wola';
const RESULTS_DIR = './scraper_results';
const LOG_DIR = './logs/final_scraper';

// Создаем необходимые директории
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Основная функция скрапера
 */
async function finalScraper() {
  console.log('=== STARTING FINAL SCRAPER ===');
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, MAX_RUNTIME);
  
  try {
    // ЭТАП 1: ИЗВЛЕЧЕНИЕ СПИСКА URL ОБЪЯВЛЕНИЙ
    console.log('\n--- PHASE 1: EXTRACTING PROPERTY LISTINGS ---');
    
    // 1. Запускаем браузер с оптимальными настройками
    console.log('Launching browser...');
    const browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // 2. Создаем контекст и устанавливаем cookies
    console.log('Creating context and loading session...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    
    // 3. Загружаем cookies из файла
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    await context.addCookies(sessionData.cookies);
    
    // 4. Создаем страницу
    const page = await context.newPage();
    
    // 5. Переходим на страницу результатов поиска
    console.log(`Navigating to search page: ${TARGET_URL}`);
    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log(`Page loaded with status: ${response?.status()}`);
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // 6. Делаем скриншот страницы результатов
    const searchScreenshot = path.join(LOG_DIR, `search_page_${Date.now()}.png`);
    await page.screenshot({ path: searchScreenshot });
    console.log(`Search page screenshot saved to: ${searchScreenshot}`);
    
    // 7. Сохраняем HTML страницы результатов
    const searchHTML = await page.content();
    const searchHTMLPath = path.join(LOG_DIR, `search_page_${Date.now()}.html`);
    fs.writeFileSync(searchHTMLPath, searchHTML);
    console.log(`Search page HTML saved to: ${searchHTMLPath}`);
    
    // 8. Извлекаем URL объявлений
    console.log('Extracting property listing URLs...');
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
    
    console.log(`Found ${listingUrls.length} property listings`);
    
    // 9. Извлекаем информацию о количестве объявлений
    const listingCount = await page.evaluate(() => {
      const countElement = document.querySelector('[data-cy="search.listing-panel.label"]');
      return countElement ? countElement.textContent?.trim() : null;
    });
    
    console.log(`Listing count: ${listingCount || 'Not found'}`);
    
    // 10. Сохраняем список URL объявлений
    const urlsFile = path.join(RESULTS_DIR, `property_urls_${Date.now()}.json`);
    fs.writeFileSync(urlsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      searchUrl: TARGET_URL,
      count: listingCount,
      totalUrls: listingUrls.length,
      urls: listingUrls
    }, null, 2));
    
    console.log(`Property URLs saved to: ${urlsFile}`);
    
    // ЭТАП 2: ИЗВЛЕЧЕНИЕ ДАННЫХ ОБ ОДНОМ ОБЪЯВЛЕНИИ
    if (listingUrls.length > 0) {
      console.log('\n--- PHASE 2: EXTRACTING SINGLE PROPERTY DETAILS ---');
      
      // 11. Выбираем первое объявление
      const propertyUrl = listingUrls[0];
      console.log(`Selected property: ${propertyUrl}`);
      
      // 12. Переходим на страницу объявления
      console.log('Navigating to property page...');
      const propertyResponse = await page.goto(propertyUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      console.log(`Property page loaded with status: ${propertyResponse?.status()}`);
      const propertyTitle = await page.title();
      console.log(`Property page title: ${propertyTitle}`);
      
      // 13. Делаем скриншот страницы объявления
      const propertyScreenshot = path.join(LOG_DIR, `property_page_${Date.now()}.png`);
      await page.screenshot({ path: propertyScreenshot });
      console.log(`Property page screenshot saved to: ${propertyScreenshot}`);
      
      // 14. Сохраняем HTML страницы объявления
      const propertyHTML = await page.content();
      const propertyHTMLPath = path.join(LOG_DIR, `property_page_${Date.now()}.html`);
      fs.writeFileSync(propertyHTMLPath, propertyHTML);
      console.log(`Property page HTML saved to: ${propertyHTMLPath}`);
      
      // 15. Закрываем Playwright ресурсы, чтобы освободить память
      await page.close();
      await context.close();
      await browser.close();
      
      // 16. Загружаем HTML с Cheerio для быстрого и надежного парсинга
      console.log('Parsing property page with Cheerio...');
      const $ = cheerio.load(propertyHTML);
      
      // 17. Извлекаем данные об объявлении
      // Заголовок
      const title = $('h1').first().text().trim();
      
      // Цена
      const priceElement = $('[data-cy="adPageHeaderPrice"], .css-8qi9av').first();
      const price = priceElement.length ? priceElement.text().trim() : '';
      
      // Адрес
      const addressElement = $('[data-cy="adPageAdLocation"], .css-1l2t9ew').first();
      const address = addressElement.length ? addressElement.text().trim() : '';
      
      // Изображение
      const imageElement = $('[data-cy="galleryMainPhoto"] img, .css-1bmvmcl img').first();
      const imageUrl = imageElement.length ? imageElement.attr('src') || '' : '';
      
      // Описание (ограничиваем длину)
      const descriptionElement = $('[data-cy="adPageAdDescription"], .css-1wq79dc').first();
      let description = descriptionElement.length ? descriptionElement.text().trim() : '';
      if (description.length > 300) {
        description = description.substring(0, 300) + '...';
      }
      
      // Параметры объявления
      const details: Record<string, string> = {};
      
      // Ищем таблицу деталей по типичным селекторам
      $('div[role="row"]').each((i, row) => {
        const label = $(row).find('div[role="cell"]').first();
        const value = $(row).find('div[role="cell"]').last();
        
        if (label.length && value.length) {
          const labelText = label.text().trim();
          const valueText = value.text().trim();
          
          if (labelText && valueText) {
            details[labelText] = valueText;
          }
        }
      });
      
      // Альтернативный поиск деталей по классам
      $('.css-1qfvxwr, .css-1gj6jav').each((i, row) => {
        const label = $(row).find('.css-1ccyb84, .css-1qvli4o').first();
        const value = $(row).find('.css-1wi2w6s, .css-1qkvt8k').first();
        
        if (label.length && value.length) {
          const labelText = label.text().trim();
          const valueText = value.text().trim();
          
          if (labelText && valueText && !details[labelText]) {
            details[labelText] = valueText;
          }
        }
      });
      
      // Извлекаем специфические параметры
      let area = '';
      let rooms = '';
      let floor = '';
      
      // Поиск по заголовкам на польском и английском
      for (const [key, value] of Object.entries(details)) {
        if (key.includes('Powierzchnia') || key.includes('Area')) {
          area = value;
        } else if (key.includes('Liczba pokoi') || key.includes('Rooms')) {
          rooms = value;
        } else if (key.includes('Piętro') || key.includes('Floor')) {
          floor = value;
        }
      }
      
      // 18. Структурируем и обрабатываем данные
      // Извлекаем числовые значения
      const extractNumber = (str: string): number => {
        const matches = str.match(/[\d\s,.]+/);
        if (!matches) return 0;
        
        const cleaned = matches[0].replace(/\s/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
      };
      
      const priceValue = extractNumber(price);
      const areaValue = extractNumber(area);
      
      // Рассчитываем цену за метр квадратный
      let pricePerSqm = 0;
      if (priceValue > 0 && areaValue > 0) {
        pricePerSqm = Math.round(priceValue / areaValue);
      }
      
      // Извлекаем ID объявления из URL
      const adIdRegex = /ID([a-zA-Z0-9]+)/;
      const adIdMatch = propertyUrl.match(adIdRegex);
      const adId = adIdMatch ? adIdMatch[1] : '';
      
      // 19. Формируем финальный результат
      const propertyData = {
        id: adId,
        url: propertyUrl,
        title,
        price: {
          text: price,
          value: priceValue
        },
        area: {
          text: area,
          value: areaValue
        },
        pricePerSqm: {
          text: pricePerSqm > 0 ? `${pricePerSqm} zł/m²` : '',
          value: pricePerSqm
        },
        address,
        rooms,
        floor,
        imageUrl,
        description,
        details
      };
      
      // 20. Выводим и сохраняем результаты
      console.log('\n=== EXTRACTED PROPERTY DATA ===');
      console.log(`ID: ${propertyData.id}`);
      console.log(`Title: ${propertyData.title}`);
      console.log(`Price: ${propertyData.price.text} (${propertyData.price.value} PLN)`);
      console.log(`Area: ${propertyData.area.text} (${propertyData.area.value} m²)`);
      console.log(`Price per m²: ${propertyData.pricePerSqm.text}`);
      console.log(`Address: ${propertyData.address}`);
      console.log(`Rooms: ${propertyData.rooms}`);
      console.log(`Floor: ${propertyData.floor}`);
      console.log(`Image URL: ${propertyData.imageUrl}`);
      console.log(`Description: ${propertyData.description.substring(0, 100)}...`);
      
      console.log('\nDetails:');
      for (const [key, value] of Object.entries(propertyData.details)) {
        console.log(`  ${key}: ${value}`);
      }
      
      // 21. Сохраняем результаты в JSON-файл
      const resultsFile = path.join(RESULTS_DIR, `final_data_${Date.now()}.json`);
      fs.writeFileSync(resultsFile, JSON.stringify({
        status: 'success',
        timestamp: new Date().toISOString(),
        searchUrl: TARGET_URL,
        propertyUrl,
        extractionTimeMs: Date.now() - startTime,
        data: propertyData
      }, null, 2));
      
      console.log(`\nFinal results saved to: ${resultsFile}`);
    }
    
  } catch (error) {
    console.error(`ERROR: ${(error as Error).message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `final_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      stack: (error as Error).stack,
      extractionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error information saved to: ${errorFile}`);
  } finally {
    clearTimeout(timeoutId);
    console.log(`\nTotal execution time: ${Date.now() - startTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
}

// Запускаем скрапер
finalScraper()
  .then(() => setTimeout(() => process.exit(0), 100))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });