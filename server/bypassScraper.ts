// Скрапер с дополнительными методами для обхода антибот защиты
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

async function bypassScrape() {
  console.log('==== BYPASS SCRAPER TEST ====');
  console.log('Starting scraper with anti-bot bypass techniques...');
  
  let browser;
  try {
    // Создаем расширенный список аргументов для запуска браузера
    // Используем флаги, которые делают браузер более похожим на обычный
    const launchArgs = [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled', // Скрываем автоматизацию
      '--disable-features=IsolateOrigins,site-per-process', // Отключаем некоторые защитные функции
      '--disable-site-isolation-trials',
      '--window-size=1920,1080',
      '--start-maximized',
      '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"'
    ];
    
    // Запускаем браузер с расширенными опциями
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: launchArgs
    });
    
    console.log('✓ Browser launched with anti-detection parameters');
    
    // Создаем контекст с более реалистичными настройками
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      // Устанавливаем правдоподобные данные о браузере
      javaScriptEnabled: true,
      hasTouch: false,
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      colorScheme: 'light',
      // Устанавливаем правдоподобные координаты для Варшавы
      geolocation: { longitude: 21.0122, latitude: 52.2297 },
      permissions: ['geolocation'],
      // Эмулируем железо и ОС
      screen: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      acceptDownloads: true
    });
    
    console.log('✓ Browser context created with realistic parameters');
    
    // Создаем страницу
    const page = await context.newPage();
    console.log('✓ Page created');
    
    // Устанавливаем дополнительные заголовки для запросов
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });
    
    // Маскируем WebDriver
    await page.addInitScript(() => {
      // Скрываем свойства webdriver и automation
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'pl', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [
        {
          0: {
            type: 'application/x-google-chrome-pdf',
            suffixes: 'pdf',
            description: 'Portable Document Format',
            enabledPlugin: {}
          },
          description: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer'
        }
      ]});
    });
    
    console.log('✓ Set up browser fingerprint masking');
    
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
        value: 'isIABGlobal=false&datestamp=Mon+Apr+29+2024+08%3A05%3A54+GMT%2B0000&version=202209.1.0&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0&geolocation=PL%3B14&AwaitingReconsent=false',
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    
    console.log('✓ Cookie consent bypass configured');
    
    // Симуляция человеческого поведения: сначала переходим на главную страницу
    console.log('Opening main page first to simulate normal browsing pattern...');
    await page.goto('https://www.otodom.pl/', { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Делаем паузу 2-4 секунды, как обычный пользователь
    const randomDelay = 2000 + Math.floor(Math.random() * 2000);
    await page.waitForTimeout(randomDelay);
    
    // Симулируем движения мыши
    await page.mouse.move(Math.random() * 500, Math.random() * 500);
    await page.waitForTimeout(300);
    await page.mouse.move(Math.random() * 500, Math.random() * 500);
    
    // Делаем скролл
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });
    await page.waitForTimeout(700);
    
    // Делаем скриншот главной страницы
    const mainScreenshotPath = './logs/bypass_main_page.png';
    await page.screenshot({ path: mainScreenshotPath });
    console.log(`✓ Main page loaded and screenshot saved`);
    
    // Теперь переходим на страницу с результатами через DOM события (имитация клика)
    console.log('Simulating natural navigation to search results page...');
    
    // Сначала ищем и кликаем на ссылку "Продажа" (Sprzedaż)
    try {
      await page.click('a[href="/pl/oferty/sprzedaz"]', { force: true });
      // Ждем загрузки страницы
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      console.log('✓ Clicked on sales category link');
      
      // Теперь выбираем "Квартиры" (Mieszkanie)
      await page.click('a[href*="/mieszkanie"]', { force: true });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      console.log('✓ Clicked on apartment category link');
      
      // Теперь выбираем Варшаву
      await page.click('a[href*="/warszawa"]', { force: true });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      
      console.log('✓ Clicked on Warsaw location link');
      
      // Теперь переходим в конкретный район (Śródmieście)
      await page.click('a[href*="/srodmiescie"]', { force: true });
      await page.waitForLoadState('domcontentloaded');
      
      console.log('✓ Clicked on district link');
    } catch (error) {
      console.log('Error during navigation clicks, trying direct URL:', error);
      
      // Если клики не сработали, пробуем прямой переход с эмуляцией реферера
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?limit=36&roomsNumber=%5BTHREE%5D', { 
        waitUntil: 'domcontentloaded',
        timeout: 20000,
        referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa'
      });
    }
    
    // Добавляем естественную паузу
    await page.waitForTimeout(2000);
    
    // Делаем скриншот страницы результатов
    const resultsScreenshotPath = './logs/bypass_results_page.png';
    await page.screenshot({ path: resultsScreenshotPath });
    console.log(`✓ Results page screenshot saved to ${resultsScreenshotPath}`);
    
    // Получаем URL текущей страницы
    const currentUrl = page.url();
    console.log(`Current page URL: ${currentUrl}`);
    
    // Сохраняем HTML страницы
    const html = await page.content();
    fs.writeFileSync('./logs/bypass_page.html', html);
    console.log('✓ Page HTML saved');
    
    // Проверяем на наличие блокировки CloudFront
    const isBlocked = html.includes('ERROR: The request could not be satisfied') || 
                      html.includes('Request blocked') ||
                      html.includes('Generated by cloudfront');
    
    if (isBlocked) {
      console.log('WARNING: Page is still being blocked by CloudFront!');
    } else {
      console.log('SUCCESS: Page loaded without CloudFront blocking!');
    }
    
    // Извлекаем данные о ценах
    console.log('Extracting price data...');
    const data = await page.evaluate(() => {
      // Проверяем, что мы не заблокированы
      if (document.title.includes('ERROR') || document.body.innerText.includes('Request blocked')) {
        return { blocked: true, prices: [] };
      }
      
      // Используем несколько селекторов для повышения вероятности нахождения цен
      const selectors = [
        '[data-cy="listing-item-price"]',
        '.css-s8lxhp', // Альтернативный селектор для цен
        'span[aria-label*="price"]',
        '.css-1q5m5kb', // Еще один возможный селектор
        'article .css-1mojcj4 span'
      ];
      
      let allPrices = [];
      let elementsCounts = {};
      
      // Перебираем все селекторы и собираем цены
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elementsCounts[selector] = elements.length;
        
        if (elements.length > 0) {
          const prices = Array.from(elements).map(el => {
            const priceText = el.textContent || '';
            return priceText.replace(/[^\d]/g, '');
          });
          
          allPrices = [...allPrices, ...prices];
        }
      }
      
      // Получаем количество объявлений если есть
      const countEl = document.querySelector('[data-cy="search.listing-panel.label"]');
      const count = countEl ? countEl.textContent : null;
      
      return { 
        blocked: false, 
        prices: allPrices, 
        count,
        elementsCounts
      };
    });
    
    console.log('Data extraction result:', data);
    
    // Сохраняем результаты в JSON
    const result = {
      timestamp: new Date().toISOString(),
      url: currentUrl,
      blocked: isBlocked,
      pricesFound: data.prices ? data.prices.length : 0,
      prices: data.prices || [],
      countText: data.count || 'Not found',
      elementsCounts: data.elementsCounts || {}
    };
    
    fs.writeFileSync('./logs/bypass_results.json', JSON.stringify(result, null, 2));
    console.log('✓ Results saved to JSON file');
    
    // Закрываем браузер
    await browser.close();
    console.log('✓ Browser closed');
    console.log('==== TEST COMPLETED SUCCESSFULLY ====');
    
    return result;
  } catch (error) {
    console.error('==== ERROR IN BYPASS TEST ====');
    console.error(error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Failed to close browser:', e);
      }
    }
    
    return { error: String(error) };
  }
}

// Запускаем тест
bypassScrape()
  .then(result => {
    console.log('Bypass test completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error in bypass test:', err);
    process.exit(1);
  });