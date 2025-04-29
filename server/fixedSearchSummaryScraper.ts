/**
 * Исправленный Search Summary Scraper
 * 
 * Использует рабочие части из directScraper и ultraSimpleScraper
 * для получения надежного извлечения данных о ценах и площади.
 */

import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';

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

// Интерфейс для данных недвижимости
interface PropertyListing {
  district: string;
  roomType: string;
  price: number;
  area: number;
  pricePerSqm: number;
}

// Конфигурация скрапера
interface ScraperConfig {
  city: string;
  district: string;
  roomType: string;
  maxPages: number;
  maxRuntime: number; // миллисекунды
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
async function searchSummaryScraper(config: ScraperConfig): Promise<PropertyListing[]> {
  console.log(`=== STARTING SEARCH SUMMARY SCRAPER: ${config.city}/${config.district}/${config.roomType} ===`);
  
  const startTime = Date.now();
  const allResults: PropertyListing[] = [];
  
  // Таймаут для выполнения всего процесса
  const timeout = setTimeout(() => {
    console.log(`Max runtime of ${config.maxRuntime}ms reached, stopping scraper...`);
    process.exit(1); // Завершаем процесс если превышено время
  }, config.maxRuntime);
  
  try {
    // Строим URL поиска
    const encodedRoomType = roomTypes[config.roomType];
    const url = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${config.city}/${config.district}?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5B${encodedRoomType}%5D&by=DEFAULT&direction=DESC&viewType=listing`;
    console.log(`Target URL: ${url}`);
    
    // Запускаем браузер
    console.log('Launching browser...');
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });
    
    // Создаем новый контекст и страницу
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      viewport: { width: 1280, height: 800 }
    });
    
    // Устанавливаем cookies для обхода баннера
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    
    const page = await context.newPage();
    
    // Добавляем скрипт для обхода обнаружения автоматизации
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    // Устанавливаем таймаут и обработчик ошибок
    page.setDefaultTimeout(30000);
    
    try {
      // Переходим на страницу
      console.log('Navigating to search page...');
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Делаем скриншот
      const screenshotPath = path.join(LOG_DIR, `${config.city}_${config.district}_${config.roomType}_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to: ${screenshotPath}`);
      
      // Обрабатываем страницы поиска
      for (let pageNum = 1; pageNum <= config.maxPages; pageNum++) {
        console.log(`Processing page ${pageNum}...`);
        
        // Если не первая страница, переходим на следующую
        if (pageNum > 1) {
          const nextPageUrl = `${url}&page=${pageNum}`;
          await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded' });
          
          // Делаем скриншот
          const pageScreenshotPath = path.join(LOG_DIR, `${config.city}_${config.district}_${config.roomType}_page${pageNum}_${Date.now()}.png`);
          await page.screenshot({ path: pageScreenshotPath, fullPage: true });
        }
        
        // Ждем загрузки контента
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          console.log('Timeout waiting for network idle, continuing anyway');
        });
        
        // Скроллим страницу для загрузки всех элементов
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight / 2);
        });
        
        await page.waitForTimeout(500);
        
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await page.waitForTimeout(500);
        
        // Извлекаем данные о ценах и площади - ВАЖНО: используем простой синтаксис JS
        const pageData = await page.evaluate(function() {
          // Простые переменные без TypeScript
          var listings = [];
          
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
          
          // Перебираем все найденные карточки
          for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            
            try {
              // Селекторы для цены
              var priceSelectors = [
                '[data-cy="listing-item-price"]',
                '[aria-label="price"]',
                '[data-testid="price"]',
                'span.css-1q5a9i8',
                '.css-143063c'
              ];
              
              // Селекторы для площади
              var areaSelectors = [
                'span[aria-label="area"] span',
                'div[data-testid="additional-information"] span:nth-child(1)',
                '[data-testid="property-parameters"] > div > span',
                'li span.css-1k12h1c:nth-child(1)'
              ];
              
              // Ищем элемент с ценой
              var priceElement = null;
              for (var p = 0; p < priceSelectors.length; p++) {
                var element = card.querySelector(priceSelectors[p]);
                if (element) {
                  priceElement = element;
                  break;
                }
              }
              
              // Ищем элемент с площадью
              var areaElement = null;
              for (var a = 0; a < areaSelectors.length; a++) {
                var element = card.querySelector(areaSelectors[a]);
                if (element) {
                  areaElement = element;
                  break;
                }
              }
              
              // Если нашли оба элемента, извлекаем текст
              if (priceElement && areaElement) {
                var priceText = priceElement.textContent || '';
                var areaText = areaElement.textContent || '';
                
                listings.push({
                  priceText: priceText.trim(),
                  areaText: areaText.trim()
                });
              }
            } catch (e) {
              console.error('Error processing card:', e);
            }
          }
          
          return listings;
        });
        
        console.log(`Extracted raw data for ${pageData.length} properties on page ${pageNum}`);
        
        // Обрабатываем извлеченные данные вне evaluate
        for (const item of pageData) {
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
              allResults.push({
                district: districtNames[config.district] || config.district,
                roomType: config.roomType,
                price,
                area,
                pricePerSqm
              });
            }
          } catch (error) {
            console.error('Error processing listing:', error);
          }
        }
        
        // Проверяем, есть ли кнопка следующей страницы
        const hasNextPage = await page.$$('[data-cy="pagination.next-page"]').then(els => els.length > 0);
        if (!hasNextPage && pageNum < config.maxPages) {
          console.log('No next page button found, stopping pagination');
          break;
        }
      }
      
      // Сохраняем результаты в файл
      const resultPath = path.join(RESULTS_DIR, `${config.city}_${config.district}_${config.roomType}_${Date.now()}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(allResults, null, 2));
      console.log(`Results saved to: ${resultPath}`);
      
    } catch (error) {
      console.error('ERROR:', error);
      
      // Сохраняем информацию об ошибке
      const errorPath = path.join(LOG_DIR, `error_${config.city}_${config.district}_${config.roomType}_${Date.now()}.json`);
      fs.writeFileSync(errorPath, JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        config,
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
  } finally {
    // Очищаем таймаут
    clearTimeout(timeout);
  }
  
  const executionTime = Date.now() - startTime;
  console.log(`Total execution time: ${executionTime}ms`);
  console.log('=== EXTRACTION COMPLETED ===');
  
  return allResults;
}

/**
 * Основная функция запуска для указанного района и типа комнат
 */
async function runScraper(city: string, district: string, roomType: string): Promise<PropertyListing[]> {
  const config: ScraperConfig = {
    city,
    district,
    roomType,
    maxPages: 5,      // Ограничиваем 5 страницами для надежности
    maxRuntime: 90000 // 90 секунд максимум
  };
  
  return await searchSummaryScraper(config);
}

// Экспортируем функцию для использования в других модулях
export { runScraper };

// Для запуска файла напрямую используем ES модули
if (process.argv[1] === __filename) {
  runScraper('warszawa', 'srodmiescie', 'twoRoom')
    .then(() => setTimeout(() => process.exit(0), 500))
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}