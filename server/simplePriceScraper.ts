/**
 * Simple Price Scraper for Otodom
 * 
 * Максимально простой скрапер для извлечения цен одного района и типа комнат
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

// Интерфейс для результатов
interface PropertyResult {
  price: number;
  area: number;
  pricePerSqm: number;
}

// Основная функция скрапера
async function scrapeOtodomPrices(city = 'warszawa', district = 'srodmiescie', roomType = 'twoRoom') {
  console.log(`==== SIMPLE OTODOM PRICE SCRAPER ====`);
  console.log(`Starting scrape for ${city}/${district}/${roomType}`);
  
  const startTime = Date.now();
  let browser = null;
  
  try {
    // Создаем папку для результатов и логов
    const resultsDir = 'scraper_results';
    const logsDir = 'logs/simple_scraper';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Карта типов комнат для URL
    const roomTypeParams: Record<string, string> = {
      'oneRoom': 'ONE',
      'twoRoom': 'TWO',
      'threeRoom': 'THREE',
      'fourPlusRoom': 'FOUR_AND_MORE'
    };
    
    // Строим URL поиска
    const encodedRoomType = roomTypeParams[roomType];
    const targetUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${city}/${district}?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5B${encodedRoomType}%5D&by=DEFAULT&direction=DESC&viewType=listing`;
    console.log(`Target URL: ${targetUrl}`);
    
    // Запускаем браузер, используя системный Chromium
    console.log('Launching browser using system Chromium...');
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Создаем контекст и страницу
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
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
    
    // Переходим на страницу поиска
    console.log('Navigating to search page...');
    await page.goto(targetUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Делаем скриншот начального состояния
    const initialScreenshotPath = path.join(logsDir, `initial_${city}_${district}_${roomType}_${Date.now()}.png`);
    await page.screenshot({ path: initialScreenshotPath, fullPage: false });
    console.log(`Initial screenshot saved to ${initialScreenshotPath}`);
    
    // Эмулируем человеческое поведение - ждем, скроллим
    console.log('Emulating human behavior...');
    
    // Ждем загрузки контента
    console.log('Waiting for content to load...');
    await page.waitForTimeout(3000);
    
    // Принимаем куки, если есть диалог
    try {
      console.log('Trying to accept cookies...');
      const acceptCookieSelectors = [
        '#onetrust-accept-btn-handler',
        'button[aria-label="accept cookies"]',
        'button.consent-give',
        'button.cookie-consent__agree'
      ];
      
      for (const selector of acceptCookieSelectors) {
        const cookieButton = await page.$(selector);
        if (cookieButton) {
          console.log(`Found cookie consent button with selector: ${selector}`);
          await cookieButton.click();
          console.log('Clicked on cookie consent button');
          break;
        }
      }
    } catch (e) {
      console.log('No cookie dialog found or failed to click:', e);
    }
    
    // Скроллим вниз медленно как человек
    console.log('Scrolling down like a human...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve(true);
          }
        }, 100);
      });
    });
    
    // Ждем после скролла
    await page.waitForTimeout(2000);
    
    // Делаем скриншот полной страницы
    const screenshotPath = path.join(logsDir, `${city}_${district}_${roomType}_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);
    
    // Извлекаем данные о ценах, используя самый простой JS
    console.log('Extracting price data...');
    const data = await page.evaluate(function() {
      // Найдем все карточки с объявлениями, используя разные селекторы
      var cards = null;
      
      // Пробуем разные селекторы для карточек - новые селекторы в начале списка
      var selectors = [
        '[data-cy="listing-item"]',
        'div[data-cy="search.listing"] li',
        'div[data-cy="search.listing.organic"] li[data-cy="listing-item"]',
        'li.css-p74l73',
        '.listing-item',
        'article[data-cy="listing-item"]',
        'article'
      ];
      
      for (var i = 0; i < selectors.length; i++) {
        var elements = document.querySelectorAll(selectors[i]);
        if (elements && elements.length > 0) {
          console.log('Found ' + elements.length + ' cards with selector: ' + selectors[i]);
          cards = elements;
          break;
        }
      }
      
      // Если карточки не найдены
      if (!cards || cards.length === 0) {
        console.log('Warning: No property cards found with any selector');
        return [];
      }
      
      console.log('Found ' + cards.length + ' property cards');
      
      // Создаем массив для данных
      var results = [];
      
      // Для всех найденных карточек извлекаем цену и площадь
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        
        try {
          // Ищем элемент с ценой
          var priceElement = null;
          var priceSelectors = [
            '[data-cy="listing-item-price"]',
            '[aria-label="price"]',
            '[data-testid="price"]',
            'span.css-1q5a9i8',
            '.css-143063c',
            '.css-0' // Базовый CSS-класс, который часто используется
          ];
          
          for (var p = 0; p < priceSelectors.length; p++) {
            var element = card.querySelector(priceSelectors[p]);
            if (element) {
              priceElement = element;
              break;
            }
          }
          
          // Ищем элемент с площадью
          var areaElement = null;
          var areaSelectors = [
            'span[aria-label="area"] span',
            'div[data-testid="additional-information"] span:nth-child(1)',
            '[data-testid="property-parameters"] > div > span',
            'li span.css-1k12h1c:nth-child(1)'
          ];
          
          for (var a = 0; a < areaSelectors.length; a++) {
            var element = card.querySelector(areaSelectors[a]);
            if (element) {
              areaElement = element;
              break;
            }
          }
          
          // Если нашли оба элемента, добавляем в результат
          if (priceElement && areaElement) {
            var priceText = priceElement.textContent || '';
            var areaText = areaElement.textContent || '';
            
            results.push({
              priceText: priceText.trim(),
              areaText: areaText.trim()
            });
          }
        } catch (e) {
          console.error('Error processing card:', e);
        }
      }
      
      return results;
    });
    
    console.log(`Extracted raw data for ${data.length} properties`);
    
    // Обрабатываем полученные данные
    const processedResults: PropertyResult[] = [];
    
    for (const item of data) {
      try {
        // Парсим цену
        let price = 0;
        
        // Удаляем все нецифровые символы кроме чисел, получаем только числа
        const priceNumbers = item.priceText.replace(/[^\d]/g, '');
        if (priceNumbers) {
          price = parseInt(priceNumbers, 10);
        }
        
        // Парсим площадь
        let area = 0;
        
        // Извлекаем число перед "m²" или "m2"
        const areaMatches = item.areaText.match(/(\d+[.,]?\d*)\s*m/);
        if (areaMatches && areaMatches[1]) {
          // Заменяем запятую на точку если есть
          const cleanedArea = areaMatches[1].replace(',', '.');
          area = parseFloat(cleanedArea);
        } else {
          // Если не нашли по шаблону, просто ищем любые числа
          const areaNumbers = item.areaText.match(/\d+/);
          if (areaNumbers) {
            area = parseInt(areaNumbers[0], 10);
          }
        }
        
        // Считаем цену за м²
        if (price > 0 && area > 0) {
          const pricePerSqm = Math.round(price / area);
          
          processedResults.push({
            price,
            area,
            pricePerSqm
          });
        }
      } catch (error) {
        console.error('Error processing item:', error);
      }
    }
    
    console.log(`Successfully processed ${processedResults.length} properties`);
    
    // Рассчитываем статистику
    if (processedResults.length > 0) {
      const totalPrice = processedResults.reduce((sum, item) => sum + item.price, 0);
      const totalArea = processedResults.reduce((sum, item) => sum + item.area, 0);
      const totalPricePerSqm = processedResults.reduce((sum, item) => sum + item.pricePerSqm, 0);
      
      const avgPrice = Math.round(totalPrice / processedResults.length);
      const avgArea = parseFloat((totalArea / processedResults.length).toFixed(1));
      const avgPricePerSqm = Math.round(totalPricePerSqm / processedResults.length);
      
      // Выводим статистику
      console.log('=== STATISTICS ===');
      console.log(`Total properties: ${processedResults.length}`);
      console.log(`Average price: ${avgPrice} PLN`);
      console.log(`Average area: ${avgArea} m²`);
      console.log(`Average price per m²: ${avgPricePerSqm} PLN`);
      
      // Сохраняем результаты
      const resultPath = path.join(resultsDir, `${city}_${district}_${roomType}_${Date.now()}.json`);
      fs.writeFileSync(resultPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        city,
        district,
        roomType,
        count: processedResults.length,
        summary: {
          avgPrice,
          avgArea,
          avgPricePerSqm
        },
        properties: processedResults
      }, null, 2));
      
      console.log(`Results saved to: ${resultPath}`);
    } else {
      console.log('No valid properties found');
      
      // Сохраняем содержимое страницы для анализа
      const htmlPath = path.join(logsDir, `empty_${city}_${district}_${roomType}_${Date.now()}.html`);
      fs.writeFileSync(htmlPath, await page.content());
      console.log(`Page HTML saved to: ${htmlPath} for analysis`);
    }
    
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    // Закрываем браузер
    if (browser) {
      await browser.close();
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`Total execution time: ${executionTime}ms`);
    console.log('==== SCRAPER COMPLETED ====');
  }
}

// Экспортируем функцию для использования в API
export { scrapeOtodomPrices };