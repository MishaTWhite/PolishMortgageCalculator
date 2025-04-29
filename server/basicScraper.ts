/**
 * Basic Scraper - упрощенная версия скрапера для Otodom
 * Оптимизировано для надежности и простоты
 */

import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';

// Директории для логов и результатов
const LOG_DIR = 'logs/basic_scraper';
const RESULTS_DIR = 'scraper_results';

// Создаем директории если их нет
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Интерфейс для данных недвижимости
interface PropertyListing {
  district: string;
  roomType: string;
  price: number;
  area: number;
  pricePerSqm: number;
}

// Карта названий районов
const districtNames: { [key: string]: string } = {
  'srodmiescie': 'Śródmieście',
  'mokotow': 'Mokotów',
  'wola': 'Wola',
  'zoliborz': 'Żoliborz',
  'ochota': 'Ochota'
};

// Карта типов комнат
const roomTypes: { [key: string]: string } = {
  'oneRoom': 'ONE',
  'twoRoom': 'TWO',
  'threeRoom': 'THREE',
  'fourPlusRoom': 'FOUR_AND_MORE'
};

/**
 * Основная функция скрапера
 */
async function scrapePropertyData(city: string, district: string, roomType: string): Promise<PropertyListing[]> {
  console.log(`=== STARTING BASIC SCRAPER: ${city}/${district}/${roomType} ===`);
  
  const startTime = Date.now();
  const results: PropertyListing[] = [];
  
  try {
    // Строим URL поиска
    const encodedRoomType = roomTypes[roomType];
    const url = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${city}/${district}?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5B${encodedRoomType}%5D&by=DEFAULT&direction=DESC&viewType=listing`;
    console.log(`Target URL: ${url}`);
    
    // Запускаем браузер
    console.log('Launching browser with reduced features...');
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--disable-web-security',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update'
      ]
    });
    
    // Создаем новый контекст и страницу
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();
    
    // Устанавливаем таймаут
    page.setDefaultTimeout(30000);
    
    try {
      // Переходим на страницу
      console.log('Navigating to page...');
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Делаем скриншот
      const screenshotPath = path.join(LOG_DIR, `${city}_${district}_${roomType}_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to: ${screenshotPath}`);
      
      // Ждем загрузки контента
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('Timeout waiting for network idle, continuing anyway');
      });
      
      // Скроллим страницу для загрузки всех элементов
      console.log('Scrolling page to load all content...');
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
      
      // Извлекаем данные с помощью базового JavaScript (без сложного синтаксиса)
      console.log('Extracting data from page...');
      const data = await page.evaluate(function() {
        var items = [];
        
        // Пробуем различные селекторы для карточек объектов
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
      
      // Обрабатываем извлеченные данные
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
      
      // Сохраняем результаты в файл
      const resultPath = path.join(RESULTS_DIR, `${city}_${district}_${roomType}_${Date.now()}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
      console.log(`Results saved to: ${resultPath}`);
      
    } catch (error) {
      console.error('ERROR:', error);
      
      // Сохраняем информацию об ошибке
      const errorPath = path.join(LOG_DIR, `error_${city}_${district}_${roomType}_${Date.now()}.json`);
      fs.writeFileSync(errorPath, JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        executionTimeMs: Date.now() - startTime
      }, null, 2));
      
      console.log(`Error information saved to: ${errorPath}`);
    } finally {
      // Закрываем браузер
      await browser.close();
    }
    
  } catch (error) {
    console.error('FATAL ERROR:', error);
  }
  
  const executionTime = Date.now() - startTime;
  console.log(`Total execution time: ${executionTime}ms`);
  
  return results;
}

// Функция для запуска скрапера для конкретного района и типа комнат
async function runBasicScraper(city: string, district: string, roomType: string): Promise<PropertyListing[]> {
  return await scrapePropertyData(city, district, roomType);
}

export { runBasicScraper };

// Прямой запуск файла
if (process.argv[1] === __filename) {
  runBasicScraper('warszawa', 'srodmiescie', 'twoRoom')
    .then(() => setTimeout(() => process.exit(0), 500))
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}