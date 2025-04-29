/**
 * Otodom Price Scraper using Puppeteer
 * Extracts property prices from Otodom search results
 */
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Директории для результатов и логов
const RESULTS_DIR = 'scraper_results';
const LOGS_DIR = 'logs/puppeteer_scraper';

// Создаем директории если их нет
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Интерфейс для результатов
interface PropertyResult {
  price: number;
  area: number;
  pricePerSqm: number;
}

/**
 * Скрапер Otodom с использованием Puppeteer
 */
async function scrapeOtodomPrices(city = 'warszawa', district = 'srodmiescie', roomType = 'twoRoom') {
  console.log(`==== PUPPETEER OTODOM SCRAPER ====`);
  console.log(`Starting scrape for ${city}/${district}/${roomType}`);
  
  const startTime = Date.now();
  let browser = null;
  
  try {
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
    
    // Запускаем браузер
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Создаем новую страницу
    const page = await browser.newPage();
    
    // Устанавливаем размер окна
    await page.setViewport({ width: 1366, height: 768 });
    
    // Устанавливаем User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    // Переходим на страницу поиска
    console.log('Navigating to search page...');
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Делаем скриншот начального состояния
    const initialScreenshotPath = path.join(LOGS_DIR, `initial_${city}_${district}_${roomType}_${Date.now()}.png`);
    await page.screenshot({ path: initialScreenshotPath });
    console.log(`Initial screenshot saved to ${initialScreenshotPath}`);
    
    // Ждем загрузки контента
    console.log('Waiting for content to load...');
    await page.waitForTimeout(3000);
    
    // Принимаем куки, если есть диалог
    try {
      console.log('Trying to accept cookies...');
      const cookieButton = await page.$('#onetrust-accept-btn-handler');
      if (cookieButton) {
        await cookieButton.click();
        console.log('Clicked on cookie consent button');
        await page.waitForTimeout(1000);
      } else {
        console.log('No cookie button found');
      }
    } catch (e) {
      console.log('Error handling cookies:', e);
    }
    
    // Скроллим страницу вниз для загрузки всего контента
    console.log('Scrolling page...');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    // Ждем после скролла
    await page.waitForTimeout(2000);
    
    // Делаем скриншот страницы
    const screenshotPath = path.join(LOGS_DIR, `${city}_${district}_${roomType}_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);
    
    // Анализируем структуру страницы
    console.log('Analyzing page structure...');
    const pageAnalysis = await page.evaluate(() => {
      const h1Elements = document.querySelectorAll('h1');
      const h1Texts = Array.from(h1Elements).map(el => el.textContent?.trim());
      
      // Селекторы для тестирования
      const selectorTests = [
        '[data-cy="listing-item"]',
        'div[data-cy="search.listing"] li',
        'div[data-cy="search.listing.organic"] li',
        'li[data-cy]',
        'li.css-p74l73',
        '.listing-item',
        'article',
        'div[data-testid="search.listing.organic"]',
        'div[data-testid="listing-item"]'
      ];
      
      const selectorResults = {};
      selectorTests.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        selectorResults[selector] = elements.length;
      });
      
      return {
        title: document.title,
        h1Texts,
        selectorResults
      };
    });
    
    console.log('Page title:', pageAnalysis.title);
    console.log('H1 texts:', pageAnalysis.h1Texts);
    console.log('Selector tests:', pageAnalysis.selectorResults);
    
    // Извлекаем данные о ценах
    console.log('Extracting property data...');
    const propertyData = await page.evaluate(() => {
      // Результаты по умолчанию
      const results = [];
      
      // Находим все элементы с недвижимостью
      // Используем несколько селекторов для устойчивости
      let listingItems = document.querySelectorAll('[data-cy="listing-item"]');
      
      // Если не нашли, пробуем другие селекторы
      if (listingItems.length === 0) {
        listingItems = document.querySelectorAll('div[data-cy="search.listing"] li');
      }
      if (listingItems.length === 0) {
        listingItems = document.querySelectorAll('div[data-cy="search.listing.organic"] li');
      }
      if (listingItems.length === 0) {
        listingItems = document.querySelectorAll('article');
      }
      
      console.log(`Found ${listingItems.length} listing items`);
      
      // Для каждого элемента пытаемся извлечь цену и площадь
      for (const item of listingItems) {
        try {
          // Получаем текст всего элемента для анализа
          const itemText = item.textContent || '';
          
          // Ищем цену
          const priceElement = 
            item.querySelector('[data-cy="listing-item-price"]') || 
            item.querySelector('[aria-label="price"]') || 
            item.querySelector('[data-testid="price"]');
          
          let priceText = '';
          if (priceElement) {
            priceText = priceElement.textContent || '';
          } else {
            // Если не нашли по селектору, ищем по формату текста
            const priceMatch = itemText.match(/(\d[\s\d]*(?:[.,]\d+)?)\s*(?:zł|PLN)/i);
            if (priceMatch) {
              priceText = priceMatch[1];
            }
          }
          
          // Ищем площадь
          const areaElement = 
            item.querySelector('[aria-label="area"]') || 
            item.querySelector('[data-testid="additional-information"] span:first-child');
          
          let areaText = '';
          if (areaElement) {
            areaText = areaElement.textContent || '';
          } else {
            // Если не нашли по селектору, ищем по формату текста
            const areaMatch = itemText.match(/(\d+(?:[.,]\d+)?)\s*m²/);
            if (areaMatch) {
              areaText = areaMatch[1] + ' m²';
            }
          }
          
          // Если нашли и цену и площадь, добавляем в результаты
          if (priceText && areaText) {
            results.push({
              priceText: priceText.trim(),
              areaText: areaText.trim()
            });
          }
        } catch (error) {
          console.error('Error processing listing item:', error);
        }
      }
      
      return results;
    });
    
    console.log(`Extracted data for ${propertyData.length} properties`);
    
    // Если не найдены данные, сохраняем HTML для анализа
    if (propertyData.length === 0) {
      const htmlContent = await page.content();
      const htmlPath = path.join(LOGS_DIR, `empty_${city}_${district}_${roomType}_${Date.now()}.html`);
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`No properties found. Page HTML saved to: ${htmlPath}`);
    }
    
    // Обрабатываем извлеченные данные
    const processedResults: PropertyResult[] = [];
    
    for (const item of propertyData) {
      try {
        // Парсим цену
        let price = 0;
        const priceNumbers = item.priceText.replace(/[^\d]/g, '');
        if (priceNumbers) {
          price = parseInt(priceNumbers, 10);
        }
        
        // Парсим площадь
        let area = 0;
        const areaMatch = item.areaText.match(/(\d+[.,]?\d*)/);
        if (areaMatch && areaMatch[1]) {
          const cleanedArea = areaMatch[1].replace(',', '.');
          area = parseFloat(cleanedArea);
        }
        
        // Если есть и цена и площадь, рассчитываем цену за м²
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
    
    // Сохраняем результаты и рассчитываем статистику
    if (processedResults.length > 0) {
      // Рассчитываем средние значения
      const totalPrice = processedResults.reduce((sum, item) => sum + item.price, 0);
      const totalArea = processedResults.reduce((sum, item) => sum + item.area, 0);
      const totalPricePerSqm = processedResults.reduce((sum, item) => sum + item.pricePerSqm, 0);
      
      const avgPrice = Math.round(totalPrice / processedResults.length);
      const avgArea = parseFloat((totalArea / processedResults.length).toFixed(1));
      const avgPricePerSqm = Math.round(totalPricePerSqm / processedResults.length);
      
      // Сохраняем результаты в файл
      const resultPath = path.join(RESULTS_DIR, `${city}_${district}_${roomType}_${Date.now()}.json`);
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
      
      // Выводим статистику
      console.log(`=== STATISTICS ===`);
      console.log(`Total properties: ${processedResults.length}`);
      console.log(`Average price: ${avgPrice} PLN`);
      console.log(`Average area: ${avgArea} m²`);
      console.log(`Average price per m²: ${avgPricePerSqm} PLN/m²`);
      
      return {
        count: processedResults.length,
        avgPrice,
        avgArea,
        avgPricePerSqm,
        properties: processedResults
      };
    } else {
      console.log('No valid properties found with both price and area');
      return {
        count: 0,
        properties: []
      };
    }
  } catch (error) {
    console.error('ERROR in puppeteer scraper:', error);
    return {
      count: 0,
      error: error.toString(),
      properties: []
    };
  } finally {
    // Закрываем браузер
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`Total execution time: ${executionTime}ms`);
    console.log(`==== PUPPETEER SCRAPER COMPLETED ====`);
  }
}

export { scrapeOtodomPrices };

// Прямой запуск, если файл вызывается напрямую
if (process.argv[1]?.endsWith('puppeteerScraper.ts')) {
  scrapeOtodomPrices()
    .then(result => {
      console.log('Scraper completed with result:', result);
    })
    .catch(err => {
      console.error('Failed to run scraper:', err);
    });
}