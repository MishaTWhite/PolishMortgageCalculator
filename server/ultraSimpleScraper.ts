// Максимально упрощенный скрапер для изолированного тестирования
// Минимум опций, прямая навигация, без дополнительных проверок
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

async function ultraSimpleScrape() {
  console.log('==== ULTRA SIMPLE SCRAPER TEST ====');
  console.log('Starting ultra simple test with minimal options...');
  
  let browser;
  try {
    // Запуск браузера с абсолютным минимумом опций
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox']
    });
    
    console.log('✓ Browser launched');
    
    // Создание контекста без лишних настроек
    const context = await browser.newContext();
    console.log('✓ Browser context created');
    
    // Создание страницы
    const page = await context.newPage();
    console.log('✓ Page created');
    
    // Устанавливаем cookies для обхода баннера
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    console.log('✓ Cookies set to bypass banner');
    
    // Прямой переход на страницу с результатами
    console.log('Navigating directly to search results URL...');
    const url = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D';
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000
    });
    
    console.log('✓ Page loaded');
    
    // Делаем скриншот
    const screenshotPath = './logs/ultra_simple_result.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ Screenshot saved to ${screenshotPath}`);
    
    // Экстракт данных о ценах
    console.log('Extracting data...');
    const data = await page.evaluate(() => {
      // Получаем количество найденных объявлений
      const countEl = document.querySelector('[data-cy="search.listing-panel.label"]');
      const count = countEl ? countEl.textContent : 'Not found';
      
      // Получаем список цен
      const priceElements = Array.from(document.querySelectorAll('[data-cy="listing-item-price"]'));
      const prices = priceElements.map(el => {
        const text = el.textContent || '';
        // Очищаем от нечисловых символов
        return text.replace(/[^\d]/g, '');
      });
      
      return { count, prices };
    });
    
    console.log(`✓ Data extracted: Found ${data.prices.length} prices`);
    console.log(`Count element text: ${data.count}`);
    
    // Сохраняем HTML страницы для анализа
    const html = await page.content();
    fs.writeFileSync('./logs/ultra_simple_page.html', html);
    console.log('✓ Page HTML saved');
    
    // Сохраняем результаты в JSON
    const result = {
      timestamp: new Date().toISOString(),
      url,
      pricesFound: data.prices.length,
      prices: data.prices,
      countText: data.count
    };
    
    fs.writeFileSync('./logs/ultra_simple_result.json', JSON.stringify(result, null, 2));
    console.log('✓ Results saved to JSON file');
    
    // Закрываем браузер
    await browser.close();
    console.log('✓ Browser closed');
    console.log('==== TEST COMPLETED SUCCESSFULLY ====');
    
    return result;
  } catch (error) {
    console.error('==== ERROR IN ULTRA SIMPLE TEST ====');
    console.error(error);
    
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed after error');
      } catch (e) {
        console.error('Failed to close browser:', e);
      }
    }
    
    return { error: String(error) };
  }
}

// Запускаем тест и выводим результаты
ultraSimpleScrape()
  .then(result => {
    console.log('Test completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });