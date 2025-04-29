/**
 * Search Summary Scraper
 * 
 * Скрапер для извлечения агрегированной статистики по объявлениям прямо со страниц поиска.
 * Обрабатывает все страницы пагинации для заданной комнатности и района.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

// Типы данных
interface PropertyListing {
  district: string;
  roomType: string;
  price: number;
  area: number;
  pricePerSqm: number;
}

interface ScraperConfig {
  city: string;
  district: string;
  roomType: string;
  maxPages: number;
  maxRuntime: number;
}

// Константы
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const RESULTS_DIR = './scraper_results';
const LOG_DIR = './logs/search_summary';

// Конвертация типа комнаты в параметр URL
const roomTypeToUrlParam: Record<string, string> = {
  'oneRoom': '%5BONE%5D',
  'twoRoom': '%5BTWO%5D',
  'threeRoom': '%5BTHREE%5D',
  'fourPlusRoom': '%5BFOUR_AND_MORE%5D'
};

// Человекочитаемые имена районов и типов комнат
const districtNames: Record<string, string> = {
  'srodmiescie': 'Śródmieście',
  'wola': 'Wola',
  'mokotow': 'Mokotów',
  'zoliborz': 'Żoliborz',
  'ochota': 'Ochota',
  'praga-poludnie': 'Praga-Południe',
  'praga-polnoc': 'Praga-Północ',
  'bemowo': 'Bemowo',
  'bialoleka': 'Białołęka',
  'targowek': 'Targówek',
  'ursus': 'Ursus',
  'ursynow': 'Ursynów',
  'wilanow': 'Wilanów'
};

const roomTypeNames: Record<string, string> = {
  'oneRoom': '1 комната',
  'twoRoom': '2 комнаты',
  'threeRoom': '3 комнаты',
  'fourPlusRoom': '4+ комнат'
};

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
async function searchSummaryScraper(config: ScraperConfig) {
  console.log(`=== STARTING SEARCH SUMMARY SCRAPER: ${config.city}/${config.district}/${config.roomType} ===`);
  
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    console.log('MAX RUNTIME REACHED! Exiting process...');
    process.exit(1);
  }, config.maxRuntime);
  
  let browser: Browser | null = null;
  
  try {
    // Формируем URL поиска
    const roomParam = roomTypeToUrlParam[config.roomType] || '%5BONE%5D';
    const searchUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${config.city}/${config.district}?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=${roomParam}&by=DEFAULT&direction=DESC&viewType=listing`;
    
    console.log(`Target URL: ${searchUrl}`);
    
    // Запускаем браузер
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    // Создаем контекст
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    
    // Загружаем cookies
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    await context.addCookies(sessionData.cookies);
    
    // Создаем страницу
    const page = await context.newPage();
    
    // Переходим на страницу поиска
    console.log(`Navigating to search page...`);
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Делаем скриншот первой страницы
    const screenshotPath = path.join(LOG_DIR, `${config.city}_${config.district}_${config.roomType}_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Массив для хранения данных о всех объявлениях
    const allListings: PropertyListing[] = [];
    
    // Обрабатываем страницы пагинации
    let currentPage = 1;
    let hasNextPage = true;
    
    while (hasNextPage && currentPage <= config.maxPages) {
      console.log(`Processing page ${currentPage}...`);
      
      // Извлекаем данные об объявлениях на текущей странице
      const listings = await extractListings(page, config.district, config.roomType);
      console.log(`Found ${listings.length} listings on page ${currentPage}`);
      
      // Добавляем в общий массив
      allListings.push(...listings);
      
      // Проверяем наличие следующей страницы
      const nextPageButton = await page.$('[data-cy="pagination.next-page"]');
      if (nextPageButton && currentPage < config.maxPages) {
        console.log('Navigating to next page...');
        await nextPageButton.click();
        await page.waitForTimeout(3000); // Ждем загрузки страницы
        currentPage++;
      } else {
        hasNextPage = false;
      }
    }
    
    // Выводим статистику
    console.log(`\n=== SUMMARY STATISTICS ===`);
    console.log(`District: ${districtNames[config.district] || config.district}`);
    console.log(`Room type: ${roomTypeNames[config.roomType] || config.roomType}`);
    console.log(`Total listings: ${allListings.length}`);
    
    if (allListings.length > 0) {
      // Рассчитываем среднюю цену за м²
      const totalPricePerSqm = allListings.reduce((sum, item) => sum + item.pricePerSqm, 0);
      const avgPricePerSqm = Math.round(totalPricePerSqm / allListings.length);
      
      // Рассчитываем среднюю цену
      const totalPrice = allListings.reduce((sum, item) => sum + item.price, 0);
      const avgPrice = Math.round(totalPrice / allListings.length);
      
      console.log(`Average price: ${avgPrice} PLN`);
      console.log(`Average price per m²: ${avgPricePerSqm} PLN/m²`);
    }
    
    // Сохраняем результаты
    const timestamp = Date.now();
    const resultsFile = path.join(RESULTS_DIR, `${config.city}_${config.district}_${config.roomType}_${timestamp}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(allListings, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);
    
    // Закрываем браузер
    await page.close();
    await context.close();
    await browser.close();
    browser = null;
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(LOG_DIR, `error_${config.city}_${config.district}_${config.roomType}_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      config,
      error: error.message,
      stack: (error as Error).stack,
      executionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error information saved to: ${errorFile}`);
  } finally {
    // Закрываем браузер, если он остался открытым
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.log('Error closing browser:', (e as Error).message);
      }
    }
    
    clearTimeout(timeoutId);
    console.log(`Total execution time: ${Date.now() - startTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
}

/**
 * Извлекает данные о объявлениях с текущей страницы
 */
async function extractListings(page: Page, district: string, roomType: string): Promise<PropertyListing[]> {
  // Находим все карточки объявлений на странице
  return page.evaluate((district, roomType, districtNames) => {
    const results: PropertyListing[] = [];
    
    // Используем наиболее распространенные селекторы для карточек объявлений
    const cards = document.querySelectorAll('article[data-cy]');
    
    cards.forEach(card => {
      try {
        // Извлекаем цену
        const priceElement = card.querySelector('[data-testid="price"]') || 
                           card.querySelector('.css-1956j2i') ||
                           card.querySelector('.css-rmqm02');
        
        // Извлекаем площадь
        const areaElement = card.querySelector('.css-1etgmdo span:nth-child(1)') || 
                          card.querySelector('[data-testid="property-parameters"] > div > span');
        
        if (priceElement && areaElement) {
          // Парсим цену
          const priceText = priceElement.textContent || '';
          const priceMatch = priceText.match(/[0-9\s,.]+/);
          let price = 0;
          
          if (priceMatch) {
            const cleanedPrice = priceMatch[0].replace(/\s/g, '').replace(',', '.');
            price = parseInt(cleanedPrice, 10);
          }
          
          // Парсим площадь
          const areaText = areaElement.textContent || '';
          const areaMatch = areaText.match(/([0-9]+[.,][0-9]+|[0-9]+)\s*m²/);
          let area = 0;
          
          if (areaMatch) {
            const cleanedArea = areaMatch[1].replace(',', '.');
            area = parseFloat(cleanedArea);
          }
          
          // Рассчитываем цену за м²
          let pricePerSqm = 0;
          if (price > 0 && area > 0) {
            pricePerSqm = Math.round(price / area);
          }
          
          // Добавляем в результаты только если удалось извлечь оба значения
          if (price > 0 && area > 0) {
            results.push({
              district: districtNames[district] || district,
              roomType,
              price,
              area,
              pricePerSqm
            });
          }
        }
      } catch (e) {
        // Игнорируем ошибки в отдельных карточках
        console.error('Error processing card:', e);
      }
    });
    
    return results;
  }, district, roomType, districtNames);
}

/**
 * Основная функция запуска для указанного района и типа комнат
 */
async function runScraper(city: string, district: string, roomType: string) {
  const config: ScraperConfig = {
    city,
    district,
    roomType,
    maxPages: 5,      // Ограничиваем 5 страницами для надежности
    maxRuntime: 60000 // 60 секунд максимум
  };
  
  await searchSummaryScraper(config);
}

// Экспортируем функцию для использования в других модулях
export { runScraper };

// Для запуска файла напрямую используем метод импорта с параметром URL
// Это заменяет проверку require.main === module в ES модулях
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  runScraper('warszawa', 'srodmiescie', 'twoRoom')
    .then(() => setTimeout(() => process.exit(0), 50))
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}