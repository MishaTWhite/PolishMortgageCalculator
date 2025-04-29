/**
 * Scraper для извлечения агрегированной информации о ценах недвижимости с Otodom
 * Использует проверенный подход с простой навигацией и извлечением данных 
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Интерфейс для данных о недвижимости
interface PropertyListing {
  district: string;
  roomType: string;
  price: number;
  area: number;
  pricePerSqm: number;
}

// Интерфейс для конфигурации скрапера
interface ScraperConfig {
  city: string;
  district: string;
  roomType: string;
  maxPages: number;
  maxRuntime: number;
}

// Директории для логов и результатов
const LOG_DIR = 'logs/search_summary';
const RESULTS_DIR = 'scraper_results';

// Создаем директории если их нет
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Карта названий районов
const districtNames: { [key: string]: string } = {
  'srodmiescie': 'Śródmieście',
  'mokotow': 'Mokotów',
  'wola': 'Wola',
  'zoliborz': 'Żoliborz',
  'ochota': 'Ochota'
};

// Карта типов комнат для URL
const roomTypeParams: { [key: string]: string } = {
  'oneRoom': 'ONE',
  'twoRoom': 'TWO',
  'threeRoom': 'THREE',
  'fourPlusRoom': 'FOUR_AND_MORE'
};

/**
 * Основная функция скрапера
 */
async function scrapePropertyData(config: ScraperConfig): Promise<PropertyListing[]> {
  const { city, district, roomType, maxPages, maxRuntime } = config;
  const startTime = Date.now();
  console.log(`=== STARTING SEARCH SUMMARY SCRAPER: ${city}/${district}/${roomType} ===`);
  
  // Установка таймаута для всего процесса
  const runtimeTimeout = setTimeout(() => {
    console.error(`ERROR: Runtime exceeded maximum allowed time of ${maxRuntime}ms`);
  }, maxRuntime);
  
  let browser = null;
  const results: PropertyListing[] = [];
  
  try {
    // Строим URL для поиска
    const encodedRoomType = roomTypeParams[roomType];
    const targetUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${city}/${district}?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5B${encodedRoomType}%5D&by=DEFAULT&direction=DESC&viewType=listing`;
    console.log(`Target URL: ${targetUrl}`);
    
    // Запускаем браузер с базовыми настройками
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    // Создаем контекст с базовыми настройками
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    
    // Устанавливаем cookie для обхода баннера
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
      },
      {
        name: 'OptanonConsent',
        value: 'isIABGlobal=false&datestamp=Sun+Apr+28+2024+08%3A05%3A54+GMT%2B0000&version=202209.1.0&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0&geolocation=PL%3B14&AwaitingReconsent=false',
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    
    // Создаем страницу
    const page = await context.newPage();
    
    // Устанавливаем пользовательский скрипт для обхода обнаружения автоматизации
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.navigator.chrome = { runtime: {} };
    });
    
    // Переходим на страницу поиска
    console.log('Navigating to search page...');
    await page.goto(targetUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Делаем скриншот страницы
    const screenshotPath = path.join(LOG_DIR, `${city}_${district}_${roomType}_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Обрабатываем первую страницу
    console.log('Processing page 1...');
    
    try {
      // Извлекаем данные с помощью простого скрипта
      const pageResults = await extractListings(page, district, roomType);
      results.push(...pageResults);
      
      console.log(`Extracted ${pageResults.length} listings from page 1`);
      
      // Обработка дополнительных страниц - по необходимости
      // TODO: Добавить обработку пагинации
      
    } catch (error) {
      console.error('ERROR:', error);
      
      // Сохраняем информацию об ошибке
      const errorPath = path.join(LOG_DIR, `error_${city}_${district}_${roomType}_${Date.now()}.json`);
      fs.writeFileSync(errorPath, JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        config,
        error: error.toString(),
        stack: error.stack,
        executionTimeMs: Date.now() - startTime
      }, null, 2));
      
      console.log(`Error information saved to: ${errorPath}`);
    }
    
    // Сохраняем результаты
    if (results.length > 0) {
      const resultPath = path.join(RESULTS_DIR, `${city}_${district}_${roomType}_${Date.now()}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
      console.log(`Saved ${results.length} results to: ${resultPath}`);
    } else {
      console.log('No results extracted');
    }
    
  } catch (error) {
    console.error('FATAL ERROR:', error);
    
    // Сохраняем информацию об ошибке
    const errorPath = path.join(LOG_DIR, `error_${city}_${district}_${roomType}_${Date.now()}.json`);
    fs.writeFileSync(errorPath, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      config,
      error: error.toString(),
      stack: error.stack,
      executionTimeMs: Date.now() - startTime
    }, null, 2));
    
    console.log(`Error information saved to: ${errorPath}`);
  } finally {
    // Очищаем таймаут
    clearTimeout(runtimeTimeout);
    
    // Закрываем браузер если он открыт
    if (browser) {
      await browser.close();
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`Total execution time: ${executionTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
  
  return results;
}

/**
 * Извлекает данные о объявлениях с текущей страницы
 */
async function extractListings(page: any, district: string, roomType: string): Promise<PropertyListing[]> {
  // Используем проверенный подход с минимальным JavaScript и без специфичных TS типов
  const data = await page.evaluate(function() {
    // Найдем все карточки с объявлениями, используя разные селекторы
    var cards = document.querySelectorAll('div[data-cy="search.listing.organic"] li[data-cy="listing-item"]');
    if (cards.length === 0) {
      cards = document.querySelectorAll('.listing-item');
    }
    if (cards.length === 0) {
      cards = document.querySelectorAll('li[data-cy="listing-item"]');
    }
    if (cards.length === 0) {
      cards = document.querySelectorAll('article');
    }
    
    console.log('Found ' + cards.length + ' property cards');
    
    // Создаем массив для хранения данных
    var items = [];
    
    // Перебираем все карточки
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      
      try {
        // Ищем элемент цены
        var priceElement = null;
        var priceSelectors = [
          '[data-cy="listing-item-price"]',
          '[aria-label="price"]',
          '[data-testid="price"]',
          'span.css-1q5a9i8',
          '.css-143063c'
        ];
        
        for (var p = 0; p < priceSelectors.length; p++) {
          var priceSelector = priceSelectors[p];
          var element = card.querySelector(priceSelector);
          if (element) {
            priceElement = element;
            break;
          }
        }
        
        // Ищем элемент площади
        var areaElement = null;
        var areaSelectors = [
          'span[aria-label="area"] span',
          'div[data-testid="additional-information"] span:nth-child(1)',
          '[data-testid="property-parameters"] > div > span',
          'li span.css-1k12h1c:nth-child(1)'
        ];
        
        for (var a = 0; a < areaSelectors.length; a++) {
          var areaSelector = areaSelectors[a];
          var element = card.querySelector(areaSelector);
          if (element) {
            areaElement = element;
            break;
          }
        }
        
        // Если нашли оба элемента, добавляем их в результаты
        if (priceElement && areaElement) {
          var priceText = priceElement.textContent || '';
          var areaText = areaElement.textContent || '';
          
          items.push({
            priceText: priceText.trim(),
            areaText: areaText.trim()
          });
        }
      } catch (e) {
        console.error('Error processing card:', e);
      }
    }
    
    return items;
  });
  
  console.log(`Extracted raw data for ${data.length} properties`);
  
  // Обрабатываем полученные данные (вне контекста страницы)
  const results: PropertyListing[] = [];
  
  for (const item of data) {
    try {
      // Парсим цену
      const priceMatch = item.priceText.match(/([0-9\s,.]+)/);
      let price = 0;
      
      if (priceMatch) {
        // Очищаем строку от нецифровых символов, кроме точки и запятой
        let cleanedPrice = priceMatch[1].replace(/\s/g, '');
        // Заменяем запятые на точки
        cleanedPrice = cleanedPrice.replace(',', '.');
        price = parseFloat(cleanedPrice);
        
        if (isNaN(price)) {
          // Пробуем просто найти числа
          const numbersOnly = item.priceText.match(/\d+/g);
          if (numbersOnly && numbersOnly.length > 0) {
            price = parseInt(numbersOnly.join(''), 10);
          }
        }
      }
      
      // Парсим площадь
      const areaMatch = item.areaText.match(/([0-9]+[.,][0-9]+|[0-9]+)\s*(m²|m2|m)/i);
      let area = 0;
      
      if (areaMatch) {
        const cleanedArea = areaMatch[1].replace(',', '.');
        area = parseFloat(cleanedArea);
        
        if (isNaN(area)) {
          const numbersOnly = item.areaText.match(/\d+/g);
          if (numbersOnly && numbersOnly.length > 0) {
            area = parseInt(numbersOnly[0], 10);
          }
        }
      } else {
        // Пробуем просто найти числа
        const numbersOnly = item.areaText.match(/\d+/g);
        if (numbersOnly && numbersOnly.length > 0) {
          area = parseInt(numbersOnly[0], 10);
        }
      }
      
      // Рассчитываем цену за м²
      let pricePerSqm = 0;
      if (price > 0 && area > 0) {
        pricePerSqm = Math.round(price / area);
        
        // Добавляем запись только если оба значения валидны
        results.push({
          district: districtNames[district] || district,
          roomType,
          price,
          area,
          pricePerSqm
        });
      }
    } catch (error) {
      console.error('Error processing item:', error);
    }
  }
  
  return results;
}

/**
 * Основная функция запуска для указанного района и типа комнат
 */
async function runScraperSafe(city: string, district: string, roomType: string) {
  const config: ScraperConfig = {
    city,
    district,
    roomType,
    maxPages: 5,      // Ограничиваем 5 страницами для надежности
    maxRuntime: 60000 // 60 секунд максимум
  };
  
  return await scrapePropertyData(config);
}

// Экспортируем функцию для использования в других модулях
export { runScraperSafe };

// Запуск скрапера при прямом вызове файла
if (process.argv[1] === __filename) {
  runScraperSafe('warszawa', 'srodmiescie', 'twoRoom')
    .then(() => setTimeout(() => process.exit(0), 500))
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}