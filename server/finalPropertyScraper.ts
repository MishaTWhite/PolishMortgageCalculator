/**
 * Final Property Scraper
 * 
 * Финальная версия скрапера для извлечения детальной информации об одном 
 * объявлении из списка найденных URL-адресов. Использует двухэтапный подход:
 * 1. Использует предварительно найденные URL (из finalUrlScraper)
 * 2. Извлекает полную информацию о конкретном объявлении
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

// Константы
const MAX_RUNTIME = 20000; // 20 секунд максимум
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
// Файл с предварительно найденными URL-адресами
const URLS_FILE = './scraper_results/final_urls_1745938057085.json';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если она не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Основная функция скрапера
 */
async function finalPropertyScraper() {
  console.log('=== STARTING FINAL PROPERTY SCRAPER ===');
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, MAX_RUNTIME);
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // 1. Загружаем URL-адреса из предварительно сохраненного файла
    console.log('Loading property URLs...');
    const urlsData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
    const propertyUrls = urlsData.urls;
    
    console.log(`Loaded ${propertyUrls.length} property URLs`);
    
    // 2. Выбираем первый URL для извлечения данных
    const targetUrl = propertyUrls[0];
    console.log(`Selected URL: ${targetUrl}`);
    
    // 3. Загружаем данные сессии
    console.log('Loading cookies from file...');
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    console.log(`Loaded ${sessionData.cookies.length} cookies`);
    
    // 4. Запускаем браузер с минимальными настройками
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // 5. Создаем контекст и устанавливаем куки
    console.log('Creating context and setting cookies...');
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL'
    });
    await context.addCookies(sessionData.cookies);
    
    // 6. Создаем страницу
    console.log('Creating page...');
    page = await context.newPage();
    
    // 7. Переходим по URL выбранного объявления
    console.log(`Navigating to property URL: ${targetUrl}`);
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // 8. Получаем статус загрузки и заголовок страницы
    console.log(`Page loaded with status: ${response?.status()}`);
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // 9. Делаем скриншот страницы
    const screenshotPath = path.join(RESULTS_DIR, `property_screenshot_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // 10. Извлекаем информацию о недвижимости
    console.log('Extracting property data...');
    
    const propertyData = await page.evaluate(() => {
      // Вспомогательные функции
      const cleanPrice = (str: string | null | undefined): number => {
        if (!str) return 0;
        return parseInt(str.replace(/[^\d]/g, '')) || 0;
      };
      
      const cleanArea = (str: string | null | undefined): number => {
        if (!str) return 0;
        const areaStr = str.replace(/[^\d,.]/g, '').replace(',', '.');
        return parseFloat(areaStr) || 0;
      };
      
      // Извлечение заголовка
      const title = document.querySelector('h1')?.textContent?.trim() || '';
      
      // Извлечение цены
      let priceText = '';
      let priceElement = document.querySelector('[data-cy="adPageHeaderPrice"]');
      if (!priceElement) priceElement = document.querySelector('.css-8qi9av');
      if (!priceElement) priceElement = document.querySelector('div[aria-label*="Price"]');
      
      if (priceElement) {
        priceText = priceElement.textContent?.trim() || '';
      }
      const priceValue = cleanPrice(priceText);
      
      // Извлечение адреса
      let address = '';
      let addressElement = document.querySelector('[data-cy="adPageAdLocation"]');
      if (!addressElement) addressElement = document.querySelector('.css-1b2u9v8');
      if (!addressElement) addressElement = document.querySelector('p[aria-label*="address"]');
      
      if (addressElement) {
        address = addressElement.textContent?.trim() || '';
      }
      
      // Извлечение изображения
      let imageUrl = '';
      let imageElement = document.querySelector('[data-cy="galleryMainPhoto"] img') as HTMLImageElement;
      if (!imageElement) imageElement = document.querySelector('.css-7wgo4x img') as HTMLImageElement;
      if (!imageElement) imageElement = document.querySelector('img[src*="otodom"]') as HTMLImageElement;
      
      if (imageElement && imageElement.src) {
        imageUrl = imageElement.src;
      }
      
      // Извлечение параметров из таблицы деталей
      const details: Record<string, string> = {};
      
      // Ищем таблицу параметров
      const detailsTable = document.querySelector('[data-testid="ad.top-information.table"]') || 
                          document.querySelector('[data-cy="adPageAdInformationDesktop"]');
      
      if (detailsTable) {
        const rows = detailsTable.querySelectorAll('div[role="row"]');
        rows.forEach(row => {
          const label = row.querySelector('div[role="cell"]:first-child');
          const value = row.querySelector('div[role="cell"]:last-child');
          
          if (label && value && label.textContent && value.textContent) {
            details[label.textContent.trim()] = value.textContent.trim();
          }
        });
      } else {
        // Альтернативный метод
        const detailsElements = document.querySelectorAll('.css-1qfvxwr, .css-1gj6jav');
        detailsElements.forEach(element => {
          const label = element.querySelector('.css-1ccyb84, .css-1qvli4o');
          const value = element.querySelector('.css-1wi2w6s, .css-1qkvt8k');
          
          if (label && value && label.textContent && value.textContent) {
            details[label.textContent.trim()] = value.textContent.trim();
          }
        });
      }
      
      // Извлечение площади
      let areaText = '';
      const areaLabels = ['Powierzchnia', 'Powierzchnia całkowita', 'Area'];
      
      for (const label of areaLabels) {
        if (details[label]) {
          areaText = details[label];
          break;
        }
      }
      
      const areaValue = cleanArea(areaText);
      
      // Извлечение количества комнат
      let rooms = '';
      const roomLabels = ['Liczba pokoi', 'Rooms', 'Pokoje'];
      
      for (const label of roomLabels) {
        if (details[label]) {
          rooms = details[label];
          break;
        }
      }
      
      // Расчет цены за квадратный метр
      let pricePerSqm = 0;
      let pricePerSqmText = '';
      
      if (priceValue > 0 && areaValue > 0) {
        pricePerSqm = Math.round(priceValue / areaValue);
        pricePerSqmText = `${pricePerSqm} zł/m²`;
      }
      
      // Извлечение описания
      let description = '';
      const descriptionElement = document.querySelector('[data-cy="adPageAdDescription"]') || 
                                document.querySelector('.css-1wq79dc');
      
      if (descriptionElement) {
        description = descriptionElement.textContent?.trim() || '';
      }
      
      // Извлечение идентификатора объявления из URL
      const adIdRegex = /ID([a-zA-Z0-9]+)/;
      const adIdMatch = window.location.href.match(adIdRegex);
      const adId = adIdMatch ? adIdMatch[1] : '';
      
      // Возвращаем собранные данные
      return {
        id: adId,
        url: window.location.href,
        title,
        price: {
          text: priceText,
          value: priceValue
        },
        area: {
          text: areaText,
          value: areaValue
        },
        pricePerSqm: {
          text: pricePerSqmText,
          value: pricePerSqm
        },
        address,
        rooms,
        imageUrl,
        description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
        details
      };
    });
    
    // 11. Выводим и сохраняем результаты
    console.log('\n=== EXTRACTED PROPERTY DATA ===');
    console.log(`ID: ${propertyData.id}`);
    console.log(`Title: ${propertyData.title}`);
    console.log(`Price: ${propertyData.price.text} (${propertyData.price.value} PLN)`);
    console.log(`Area: ${propertyData.area.text} (${propertyData.area.value} m²)`);
    console.log(`Price per m²: ${propertyData.pricePerSqm.text}`);
    console.log(`Address: ${propertyData.address}`);
    console.log(`Rooms: ${propertyData.rooms}`);
    console.log(`Image URL: ${propertyData.imageUrl}`);
    
    console.log('\nDetails:');
    for (const [key, value] of Object.entries(propertyData.details)) {
      console.log(`  ${key}: ${value}`);
    }
    
    // 12. Сохраняем результаты в JSON
    const resultsFile = path.join(RESULTS_DIR, `property_data_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      url: targetUrl,
      extractionTimeMs: Date.now() - startTime,
      data: propertyData
    }, null, 2));
    
    console.log(`\nResults saved to: ${resultsFile}`);
    console.log('SUCCESS: Property data extraction completed successfully!');
    
  } catch (error: any) {
    console.error(`ERROR: ${error.message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `property_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      extractionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error information saved to: ${errorFile}`);
  } finally {
    // Закрываем все ресурсы
    try {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    } catch (err: any) {
      console.log('Error during cleanup:', err.message);
    }
    
    clearTimeout(timeoutId);
    console.log(`Total execution time: ${Date.now() - startTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
}

// Запускаем скрапер
finalPropertyScraper()
  .then(() => setTimeout(() => process.exit(0), 500))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });