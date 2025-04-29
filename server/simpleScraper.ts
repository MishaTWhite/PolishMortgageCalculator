// Максимально упрощенный скрапер для изолированного тестирования
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

/**
 * Прямой переход на страницу результатов поиска без промежуточных шагов
 */
async function simpleScrapeDirectNavigation() {
  console.log('==== DIRECT NAVIGATION TEST ====');
  console.log('Starting simplified direct scraper test...');
  
  let browser = null;
  
  try {
    // Запуск браузера с минимальными опциями
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
      timeout: 30000
    });
    
    console.log('Browser launched successfully.');
    
    // Создаем контекст с базовыми настройками
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
    
    // Создаем страницу
    const page = await context.newPage();
    console.log('Page created successfully.');
    
    // Прямой переход на страницу результатов поиска
    console.log('Directly navigating to search results page...');
    const searchUrl = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BTHREE%5D&by=DEFAULT&direction=DESC&viewType=listing';
    
    // Устанавливаем cookie для обхода баннера перед загрузкой страницы
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
    
    // Переходим на страницу с уменьшенным таймаутом
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded', // Используем более быстрый waitUntil
      timeout: 20000 
    });
    
    console.log('Page loaded successfully.');
    
    // Делаем скриншот страницы результатов
    const resultsScreenshotPath = path.join(process.cwd(), 'logs', 'direct_navigation_results.png');
    await page.screenshot({ path: resultsScreenshotPath });
    console.log(`Search results screenshot saved to ${resultsScreenshotPath}`);
    
    // Извлекаем данные о ценах с помощью простого селектора
    console.log('Extracting price data...');
    const prices = await page.evaluate(() => {
      // Используем несколько селекторов для повышения вероятности нахождения цен
      const selectors = [
        '[data-cy="listing-item-price"]',
        '.css-s8lxhp', // Альтернативный селектор для цен
        'span[aria-label*="price"]',
        '.e1jyrtvq0' // Еще один возможный селектор
      ];
      
      let allPrices = [];
      
      // Перебираем все селекторы и собираем цены
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector ${selector}`);
          
          const prices = Array.from(elements).map(el => {
            const priceText = el.textContent || '';
            return priceText.replace(/[^\d]/g, '');
          });
          
          allPrices = [...allPrices, ...prices];
        }
      }
      
      return allPrices;
    });
    
    console.log(`Found ${prices.length} price elements:`, prices);
    
    // Если цены не найдены, сохраняем HTML для диагностики
    if (prices.length === 0) {
      console.log('No prices found, saving page HTML for diagnostics');
      const pageContent = await page.content();
      const contentPath = path.join(process.cwd(), 'logs', 'direct_navigation_page.html');
      fs.writeFileSync(contentPath, pageContent);
      console.log(`Page HTML saved to ${contentPath}`);
    }
    
    // Сохраняем результаты в файл
    const resultsPath = path.join(process.cwd(), 'logs', 'direct_navigation_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      prices: prices,
      url: searchUrl,
      success: prices.length > 0
    }, null, 2));
    
    console.log(`Results saved to ${resultsPath}`);
    
    // Закрываем контекст и браузер
    await context.close();
    await browser.close();
    
    console.log('==== TEST COMPLETED SUCCESSFULLY ====');
    
    // Возвращаем результаты
    return {
      success: true,
      pricesFound: prices.length,
      prices: prices
    };
  } catch (error) {
    console.error('==== ERROR IN DIRECT NAVIGATION TEST ====');
    console.error(error);
    
    // Попытка сделать скриншот ошибки если браузер еще открыт
    try {
      if (browser) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(`<html><body><h1>Error occurred</h1><pre>${error.toString()}</pre></body></html>`);
        const errorScreenshotPath = path.join(process.cwd(), 'logs', 'direct_navigation_error.png');
        await page.screenshot({ path: errorScreenshotPath });
        console.log(`Error screenshot saved to ${errorScreenshotPath}`);
        
        await context.close();
      }
    } catch (screenshotError) {
      console.error('Failed to capture error screenshot:', screenshotError);
    }
    
    // Закрываем браузер если он еще открыт
    try {
      if (browser) await browser.close();
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }
    
    return {
      success: false,
      error: String(error)
    };
  }
}

// Запускаем простой скрапер с прямой навигацией
simpleScrapeDirectNavigation()
  .then(result => {
    console.log('Direct navigation test completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error in direct navigation test:', err);
    process.exit(1);
  });