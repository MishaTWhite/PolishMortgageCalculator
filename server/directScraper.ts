// Максимально прямой скрапер для обхода CloudFront
// Прямой переход на страницу результатов без промежуточных шагов
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

/**
 * Прямой скрапер - максимально простой подход
 */
async function directScraper() {
  console.log('==== DIRECT SCRAPER ====');
  console.log('Starting direct scraper test...');
  
  let browser = null;
  try {
    // Минимальные опции запуска
    const launchOptions = {
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled'
      ],
      timeout: 10000
    };
    
    console.log('Launching browser...');
    browser = await chromium.launch(launchOptions);
    
    // Создаем базовый контекст
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
    });
    
    console.log('✓ Browser context created');
    
    // Создаем страницу
    const page = await context.newPage();
    
    // Базовый обход автоматизации
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    // Устанавливаем основные cookies
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    
    // Прямой переход на URL с результатами
    console.log('Directly navigating to results URL...');
    const url = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D';
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    // Делаем скриншот
    await page.screenshot({ path: './logs/direct_results.png' });
    console.log('✓ Results page loaded and screenshot saved');
    
    // Получаем HTML
    const pageContent = await page.content();
    
    // Проверяем на блокировку
    const isBlocked = pageContent.includes('ERROR: The request could not be satisfied') || 
                    pageContent.includes('Request blocked');
    
    // Сохраняем HTML
    fs.writeFileSync('./logs/direct_page.html', pageContent);
    console.log('✓ Page HTML saved for analysis');
    
    if (isBlocked) {
      console.log('❌ BLOCKED: CloudFront blocking detected');
    } else {
      console.log('✓ SUCCESS: Page loaded without blocking');
    }
    
    // Извлекаем данные
    const data = await page.evaluate(() => {
      // Проверяем блокировку
      if (document.title.includes('ERROR')) {
        return { blocked: true, prices: [] };
      }
      
      // Пытаемся найти цены
      const priceElements = document.querySelectorAll('[data-cy="listing-item-price"]');
      const prices = Array.from(priceElements).map(el => {
        const text = el.textContent || '';
        return text.replace(/[^\d]/g, '');
      });
      
      return { 
        blocked: false,
        prices,
        pageTitle: document.title
      };
    });
    
    // Сохраняем результаты
    fs.writeFileSync('./logs/direct_results.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      url,
      isBlocked,
      pricesFound: data.prices ? data.prices.length : 0,
      prices: data.prices || [],
      pageTitle: data.pageTitle || ''
    }, null, 2));
    
    console.log('✓ Results saved');
    
    // Закрываем браузер
    await browser.close();
    console.log('✓ Browser closed');
    console.log('==== TEST COMPLETED SUCCESSFULLY ====');
    
    return {
      success: true,
      isBlocked,
      pricesFound: data.prices ? data.prices.length : 0
    };
  } catch (error) {
    console.error('==== ERROR IN DIRECT SCRAPER ====');
    console.error(error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Failed to close browser:', e);
      }
    }
    
    return { success: false, error: String(error) };
  }
}

// Запускаем
directScraper()
  .then(result => {
    console.log('Direct scraper completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });