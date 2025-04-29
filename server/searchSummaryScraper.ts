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
    
    // Переходим на страницу поиска с более длительным таймаутом и лучшей стратегией ожидания
    console.log(`Navigating to search page...`);
    await page.goto(searchUrl, {
      waitUntil: 'networkidle',  // Ждем, пока сеть не будет неактивна (все запросы завершены)
      timeout: 30000  // 30 секунд
    });
    
    // Ждем дополнительно, чтобы убедиться, что страница полностью загружена
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
        
        // Ждем завершения навигации и загрузки страницы
        await page.waitForTimeout(5000); // Увеличиваем время ожидания
        
        // Дополнительно ждем загрузки данных
        await page.waitForSelector('div[data-cy="search.listing.organic"], .listing-item, .css-1j1jmia > li', { 
          timeout: 10000,
          state: 'attached'
        }).catch(e => console.log(`Failed to wait for listings: ${e.message}`));
        
        // Еще немного ждем для стабильности
        await page.waitForTimeout(2000);
        
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
  // Сначала сделаем скриншот для отладки с отметкой элементов, которые мы пытаемся найти
  await page.evaluate(() => {
    // Функция для добавления рамки вокруг найденных элементов
    const highlightElements = (selector: string, color: string) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        (el as HTMLElement).style.border = `3px solid ${color}`;
      });
      return elements.length;
    };
    
    // Проверяем разные селекторы и выделяем их разными цветами
    const cardsCount1 = highlightElements('div[data-cy="search.listing.organic"] li[data-cy="listing-item"]', 'red');
    const cardsCount2 = highlightElements('.css-1j1jmia > li', 'blue');
    const cardsCount3 = highlightElements('.eo9qioj1', 'green');
    
    console.log(`Found via selector 1: ${cardsCount1}, via selector 2: ${cardsCount2}, via selector 3: ${cardsCount3}`);
  });
  
  // Сделаем скриншот с подсветкой
  const debugScreenshotPath = path.join(LOG_DIR, `debug_highlighted_${district}_${roomType}_${Date.now()}.png`);
  await page.screenshot({ path: debugScreenshotPath, fullPage: true });
  console.log(`Debug screenshot with highlights saved to: ${debugScreenshotPath}`);
  
  // Используем строго ES5-стиль для функции внутри evaluate
  // Это более совместимый подход, который должен работать со всеми версиями Playwright
  return page.evaluate(function(params) {
    var district = params.district;
    var roomType = params.roomType;
    var districtNameMap = params.districtNameMap;
    var results = [];
    
    // Проверяем различные селекторы, которые могут определить карточки объявлений
    var selectors = [
      'div[data-cy="search.listing.organic"] li[data-cy="listing-item"]',
      '.listing-item', // Альтернативный селектор
      '.css-1j1jmia > li', // Еще один вариант
      '.eo9qioj1' // И еще вариант
    ];
    
    // Пробуем каждый селектор
    var cards = document.querySelectorAll('div');
    for (var i = 0; i < selectors.length; i++) {
      var selector = selectors[i];
      var foundCards = document.querySelectorAll(selector);
      if (foundCards.length > 0) {
        cards = foundCards;
        console.log('Found ' + foundCards.length + ' cards with selector: ' + selector);
        break;
      }
    }
    
    // Если не нашли карточки, пробуем другой подход - ищем все элементы, которые могут быть объявлениями
    if (cards.length === 0) {
      // Ищем элементы, содержащие цену и площадь
      var possibleCards = document.querySelectorAll('li, article, div[role="article"]');
      cards = possibleCards;
      console.log('Found ' + possibleCards.length + ' possible cards as fallback');
    }
    
    // Используем for вместо forEach для лучшей совместимости
    for (var cardIndex = 0; cardIndex < cards.length; cardIndex++) {
      var card = cards[cardIndex];
      
      try {
        // Расширенный список селекторов для цены
        var priceSelectors = [
          '[data-cy="listing-item-price"]',
          '[aria-label="price"]',
          '[data-testid="price"]',
          'span.css-1q5a9i8', // Новый селектор для цены
          '.css-143063c' // Еще один селектор
        ];
        
        // Расширенный список селекторов для площади
        var areaSelectors = [
          'span[aria-label="area"] span',
          'div[data-testid="additional-information"] span:nth-child(1)',
          '[data-testid="property-parameters"] > div > span',
          'li span.css-1k12h1c:nth-child(1)' // Новый селектор для площади
        ];
        
        var priceElement = null;
        for (var priceIndex = 0; priceIndex < priceSelectors.length; priceIndex++) {
          var priceSelector = priceSelectors[priceIndex];
          var priceElem = card.querySelector(priceSelector);
          if (priceElem) {
            priceElement = priceElem;
            console.log('Found price element with selector: ' + priceSelector);
            break;
          }
        }
        
        var areaElement = null;
        for (var areaIndex = 0; areaIndex < areaSelectors.length; areaIndex++) {
          var areaSelector = areaSelectors[areaIndex];
          var areaElem = card.querySelector(areaSelector);
          if (areaElem) {
            areaElement = areaElem;
            console.log('Found area element with selector: ' + areaSelector);
            break;
          }
        }
        
        if (priceElement && areaElement) {
          // Улучшенный парсер цены
          var priceText = priceElement.textContent || '';
          console.log('Raw price text: ' + priceText);
          
          // Сначала пробуем поискать числа с пробелами или запятыми и пробелами
          var priceMatch = priceText.match(/([0-9\s,.]+)\s*(zł|PLN)?/i);
          var price = 0;
          
          if (priceMatch) {
            console.log('Price match: ' + priceMatch[1]);
            // Удаляем все нечисловые символы, кроме точки и запятой
            var cleanedPrice = priceMatch[1].replace(/\s/g, '');
            // Заменяем запятые на точки для корректного парсинга
            cleanedPrice = cleanedPrice.replace(',', '.');
            // Если есть несколько точек, оставляем только первую (может быть ошибка в форматировании)
            var dotIndex = cleanedPrice.indexOf('.');
            if (dotIndex !== -1) {
              cleanedPrice = cleanedPrice.substring(0, dotIndex + 1) + 
                            cleanedPrice.substring(dotIndex + 1).replace(/\./g, '');
            }
            
            console.log('Cleaned price: ' + cleanedPrice);
            price = parseFloat(cleanedPrice);
            
            // Если цена всё еще не распарсилась, попробуем просто найти числа
            if (isNaN(price)) {
              var numbersOnly = priceText.match(/\d+/g);
              if (numbersOnly && numbersOnly.length > 0) {
                console.log('Fallback to numbers only: ' + numbersOnly.join(''));
                price = parseInt(numbersOnly.join(''), 10);
              }
            }
          } else {
            // Если первый подход не сработал, попробуем просто найти все числа
            var numbersOnly = priceText.match(/\d+/g);
            if (numbersOnly && numbersOnly.length > 0) {
              console.log('Fallback to numbers only: ' + numbersOnly.join(''));
              price = parseInt(numbersOnly.join(''), 10);
            }
          }
          
          // Улучшенный парсер площади
          var areaText = areaElement.textContent || '';
          console.log('Raw area text: ' + areaText);
          
          // Ищем числа с опциональной десятичной частью, за которыми следует m², m2 или просто m
          var areaMatch = areaText.match(/([0-9]+[.,][0-9]+|[0-9]+)\s*(m²|m2|m)/i);
          var area = 0;
          
          if (areaMatch) {
            console.log('Area match: ' + areaMatch[1]);
            var cleanedArea = areaMatch[1].replace(',', '.');
            area = parseFloat(cleanedArea);
            
            // Если площадь всё еще не распарсилась, попробуем просто найти числа
            if (isNaN(area)) {
              var areaNumbersOnly = areaText.match(/\d+/g);
              if (areaNumbersOnly && areaNumbersOnly.length > 0) {
                console.log('Fallback to numbers only for area: ' + areaNumbersOnly[0]);
                area = parseInt(areaNumbersOnly[0], 10);
              }
            }
          } else {
            // Если первый подход не сработал, попробуем просто найти первое число
            var areaNumbersOnly = areaText.match(/\d+/g);
            if (areaNumbersOnly && areaNumbersOnly.length > 0) {
              console.log('Fallback to numbers only for area: ' + areaNumbersOnly[0]);
              area = parseInt(areaNumbersOnly[0], 10);
            }
          }
          
          // Рассчитываем цену за м²
          var pricePerSqm = 0;
          if (price > 0 && area > 0) {
            pricePerSqm = Math.round(price / area);
          }
          
          // Добавляем в результаты только если удалось извлечь оба значения
          if (price > 0 && area > 0) {
            results.push({
              district: districtNameMap[district] || district,
              roomType: roomType,
              price: price,
              area: area,
              pricePerSqm: pricePerSqm
            });
          }
        }
      } catch (e) {
        // Игнорируем ошибки в отдельных карточках
        console.error('Error processing card:', e);
      }
    }
    
    return results;
  }, { district, roomType, districtNameMap: districtNames });
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