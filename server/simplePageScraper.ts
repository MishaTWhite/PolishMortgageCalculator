/**
 * Простой скрапер для одной страницы поиска Otodom
 * Извлекает только информацию о ценах и площади квартир
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Базовые директории
const LOG_DIR = 'logs/simple_page';
const RESULTS_DIR = 'scraper_results';

// Создаем директории если их нет
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Интерфейс для результатов
interface PropertyData {
  district: string;
  roomType: string;
  price: number;
  area: number;
  pricePerSqm: number;
}

/**
 * Извлекает данные о ценах с одной страницы поиска Otodom
 */
async function scrapeOnePage(city: string, district: string, roomType: string) {
  console.log(`====== SIMPLE PAGE SCRAPER: ${city}/${district}/${roomType} ======`);
  console.log('Starting simple scraper for one page...');
  
  let browser = null;
  
  try {
    // Строим URL для поиска в зависимости от типа квартиры
    let roomParam;
    switch (roomType) {
      case 'oneRoom': roomParam = 'ONE'; break;
      case 'twoRoom': roomParam = 'TWO'; break;
      case 'threeRoom': roomParam = 'THREE'; break;
      case 'fourPlusRoom': roomParam = 'FOUR_AND_MORE'; break;
      default: roomParam = 'TWO';
    }
    
    const searchUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${city}/${district}?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5B${roomParam}%5D&by=DEFAULT&direction=DESC&viewType=listing`;
    console.log(`Search URL: ${searchUrl}`);
    
    // Запускаем браузер с минимальными опциями
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    
    // Создаем контекст с пользовательским агентом
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    });
    
    // Устанавливаем cookie для обхода баннера
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    
    // Создаем страницу
    const page = await context.newPage();
    
    // Переходим на страницу поиска
    console.log('Navigating to search page...');
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    // Делаем скриншот страницы поиска
    const screenshotPath = path.join(LOG_DIR, `${city}_${district}_${roomType}_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Извлекаем данные о ценах и площади
    console.log('Extracting property data...');
    const rawData = await page.evaluate(() => {
      // Находим все карточки объявлений
      const listings = [];
      
      // Используем разные селекторы для карточек
      let cards = document.querySelectorAll('div[data-cy="search.listing.organic"] li[data-cy="listing-item"]');
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
      
      // Перебираем карточки и извлекаем данные
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        
        try {
          // Селекторы для цены
          const priceSelectors = [
            '[data-cy="listing-item-price"]',
            '[aria-label="price"]',
            '[data-testid="price"]'
          ];
          
          // Селекторы для площади
          const areaSelectors = [
            'span[aria-label="area"] span',
            'div[data-testid="additional-information"] span:nth-child(1)',
            '[data-testid="property-parameters"] > div > span'
          ];
          
          // Ищем цену
          let priceText = '';
          for (const selector of priceSelectors) {
            const element = card.querySelector(selector);
            if (element) {
              priceText = element.textContent || '';
              break;
            }
          }
          
          // Ищем площадь
          let areaText = '';
          for (const selector of areaSelectors) {
            const element = card.querySelector(selector);
            if (element) {
              areaText = element.textContent || '';
              break;
            }
          }
          
          // Добавляем в результаты если нашли и цену и площадь
          if (priceText && areaText) {
            listings.push({
              priceText: priceText.trim(),
              areaText: areaText.trim(),
              url: card.querySelector('a')?.href || ''
            });
          }
        } catch (e) {
          console.error('Error processing card:', e);
        }
      }
      
      return listings;
    });
    
    console.log(`Extracted ${rawData.length} raw property listings`);
    
    // Обрабатываем извлеченные данные
    const results: PropertyData[] = [];
    
    for (const item of rawData) {
      try {
        // Парсим цену
        let price = 0;
        const priceMatch = item.priceText.match(/([0-9\s,.]+)/);
        if (priceMatch) {
          // Удаляем пробелы и преобразуем запятые в точки
          let cleanedPrice = priceMatch[1].replace(/\s/g, '').replace(',', '.');
          price = parseFloat(cleanedPrice);
        }
        
        // Парсим площадь
        let area = 0;
        const areaMatch = item.areaText.match(/([0-9]+[.,][0-9]+|[0-9]+)\s*(m²|m2|m)/i);
        if (areaMatch) {
          const cleanedArea = areaMatch[1].replace(',', '.');
          area = parseFloat(cleanedArea);
        }
        
        // Вычисляем цену за квадратный метр
        if (price > 0 && area > 0) {
          const pricePerSqm = Math.round(price / area);
          
          // Добавляем в результаты
          results.push({
            district: district,
            roomType: roomType,
            price: price,
            area: area,
            pricePerSqm: pricePerSqm
          });
        }
      } catch (e) {
        console.error('Error processing listing:', e);
      }
    }
    
    // Сохраняем результаты в файл
    const resultFile = path.join(RESULTS_DIR, `${city}_${district}_${roomType}_${Date.now()}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${resultFile}`);
    
    // Выводим сводку
    if (results.length > 0) {
      const avgPrice = results.reduce((sum, item) => sum + item.price, 0) / results.length;
      const avgArea = results.reduce((sum, item) => sum + item.area, 0) / results.length;
      const avgPricePerSqm = results.reduce((sum, item) => sum + item.pricePerSqm, 0) / results.length;
      
      console.log(`\nSUMMARY for ${city}/${district}/${roomType}:`);
      console.log(`Found ${results.length} valid listings`);
      console.log(`Average price: ${Math.round(avgPrice).toLocaleString()} zł`);
      console.log(`Average area: ${avgArea.toFixed(1)} m²`);
      console.log(`Average price per m²: ${Math.round(avgPricePerSqm).toLocaleString()} zł/m²`);
    } else {
      console.log('No valid listings found with both price and area');
    }
    
    return results;
    
  } catch (error) {
    console.error('Error in simple page scraper:', error);
    
    // Сохраняем информацию об ошибке
    const errorFile = path.join(LOG_DIR, `error_${city}_${district}_${roomType}_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      error: error.toString(),
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    return [];
  } finally {
    // Закрываем браузер
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    
    console.log('====== SIMPLE PAGE SCRAPER COMPLETED ======');
  }
}

// Экспортируем функцию скрапера
export { scrapeOnePage };

// Запуск при прямом вызове файла
if (process.argv[1] === __filename) {
  // Значения по умолчанию
  const city = 'warszawa';
  const district = 'srodmiescie';
  const roomType = 'twoRoom';
  
  scrapeOnePage(city, district, roomType)
    .then(results => {
      console.log(`Scraping completed with ${results.length} results`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}