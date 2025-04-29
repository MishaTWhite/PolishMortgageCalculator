// Скрапер с использованием польских прокси для обхода CloudFront
import * as fs from 'fs';
import * as path from 'path';
import { chromium, devices } from 'playwright';

/**
 * Скрапер, использующий техники обхода CloudFront
 * со специализированными заголовками и прокси
 */
async function proxyBypass() {
  console.log('==== PROXY BYPASS SCRAPER ====');
  console.log('Starting scraper with proxy bypass techniques...');
  
  let browser = null;
  
  try {
    // Эмулируем реальный десктопный браузер
    const device = devices['Desktop Chrome'];
    
    // Минимальные опции для запуска
    const launchOptions = {
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        // Нет реальных прокси, но добавляем флаги, которые помогают обходить защиту
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
      ],
      timeout: 15000
    };
    
    console.log('Launching browser...');
    browser = await chromium.launch(launchOptions);
    
    // Создаем контекст с эмуляцией польского пользователя
    const context = await browser.newContext({
      ...device,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw', // Польский часовой пояс
      geolocation: { longitude: 21.0122, latitude: 52.2297 }, // Координаты Варшавы
      permissions: ['geolocation'],
      colorScheme: 'light',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      // Эмулируем HTTP-заголовки, присущие реальному браузеру польского пользователя
      extraHTTPHeaders: {
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'upgrade-insecure-requests': '1',
        'DNT': '1', // Do Not Track
        'Sec-GPC': '1', // Global Privacy Control
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive'
      }
    });
    
    console.log('✓ Browser context created with Polish user emulation');
    
    // Создаем страницу с глубоким обходом автоматизации
    const page = await context.newPage();
    
    // Скрываем признаки автоматизации
    await page.addInitScript(() => {
      // Маскируем navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Добавляем типичные плагины Chrome
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' },
          ];
          plugins.__proto__ = Plugin.prototype;
          return plugins;
        }
      });
      
      // Имитируем типичные языки для польского пользователя
      Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'pl', 'en-US', 'en'] });
      
      // Реалистичные характеристики аппаратного обеспечения
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      
      // Маскируем автоматизацию в WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, arguments);
      };
      
      // Добавляем фальшивые размеры экрана
      Object.defineProperty(screen, 'width', { get: () => 1920 });
      Object.defineProperty(screen, 'height', { get: () => 1080 });
      Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
      
      // Типичное разрешение окна для пользователя
      Object.defineProperty(window, 'innerWidth', { get: () => 1519 });
      Object.defineProperty(window, 'innerHeight', { get: () => 800 });
      Object.defineProperty(window, 'outerWidth', { get: () => 1519 });
      Object.defineProperty(window, 'outerHeight', { get: () => 873 });
      Object.defineProperty(window, 'screenX', { get: () => 0 });
      Object.defineProperty(window, 'screenY', { get: () => 0 });
      
      // Фиксируем canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (type === 'image/png' && this.width === 16 && this.height === 16) {
          // Возвращаем фиксированное значение для canvas fingerprint
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADDklEQVQ4jYWTSUjcFgCGPxU7SoqdoBmUSt05ZXAb2h6jqCl6KD1ki1IixCyeJC4IMbigJjQmmjZDUjALDgqJCImLMQ01kmRUxogalxB0XBJ1RFxmJMaF5/N9b/7/63fonH8a+OD/KBAPxAEfgDlAjf1XAgmRnKiI+AE/A/wjngR8ZN/xLQ6ALJK0MnLsBrKAJGABaPj0oGwgG4gFXIAXENE7QfVOkF6UIo0fOjZGjisTzyaQnL4s1Pul03Zb25x4oLBLEPtJbhdKJ+v9N/DKANCxqIqMTScqPY/M3Gukal5QoFlg43CPjbf7xDffpO5FC7k1LaSUVXO26h6umnLE4nzivUQkxHlxPlnJRf8YnM/LcVDXYgmUYQ27jKm8gYcdFrpnbZgWtnm1u8eaWKTe0E1J0UUKL5SS4HEWkVMUfQJXCLrkw4+/BvN9SCaeGWW4Z1dhLP+dBvMmNYNW9KMrLAoiC/s77L5fxdZgojOviOSweCRC/2cXAqOICPPnJwH5FwGcNKrx13ZTWDFEqWmJ+qVd1rffsL61SvvIFHp9C+acq5SOtVHhEMKKWInZNgq9TQgOF2MIFqnwvFzG5cYFijpXMa+/xbb3huHVHWqGJzHUV2M4I2F/sJZm3+9ZtA3HNngBfVI8TwQuDCVF0etxnPWEaLpOinD2L+VsTTeFbXPUrgkYlvZon92irrWZybg4xqxNNIZdxGCnZNAmnvaYGHodoqiPP8ZYlIqZBCXNMhd2T7vTkqZE2zRBrmmSe0tv6d3b5+3GAvr8HCatnXSFK9EGK2j3jmX4lDfjyT7MpXmxmi1nTZZEn5cdY+k+jMT6YD8diLNGj+OtGtx1TeRYd6ibWePRi1Xq29qYjolhVONNZ5qM1iAHrMFOTCY50eymwGLnwnKKimWlAw/DwimNeYCHQsNvkb5EVQ1S1D4g1PRY0ev1mGKcGPNNpvcnJcbTEsbCFEwlejKT5MBCggO2aA9s9srFFC/eMwX3Bn72vn/H8oNPUBIQlZAXH+Dl3fPQCEJuQJ4gLjMgLUdwStL4hN4H1PydW4OIzSwAAAAASUVORK5CYII=';
        }
        return originalToDataURL.apply(this, arguments);
      };
      
      // Подмена Chrome automation
      window.chrome = {
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
          }
        },
        runtime: {
          OnInstalledReason: {
            CHROME_UPDATE: 'chrome_update',
            INSTALL: 'install',
            SHARED_MODULE_UPDATE: 'shared_module_update',
            UPDATE: 'update'
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic'
          },
          PlatformArch: {
            ARM: 'arm',
            ARM64: 'arm64',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          },
          PlatformNaclArch: {
            ARM: 'arm',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          },
          PlatformOs: {
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            MAC: 'mac',
            OPENBSD: 'openbsd',
            WIN: 'win'
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: 'no_update',
            THROTTLED: 'throttled',
            UPDATE_AVAILABLE: 'update_available'
          }
        }
      };
    });
    
    console.log('✓ Deep anti-detection setup complete');
    
    // Устанавливаем cookie для обхода баннера
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
        expires: Date.now() / 1000 + 86400 * 7, // 7 дней в будущем
      },
      {
        name: 'OptanonConsent',
        value: 'isIABGlobal=false&datestamp=Mon+Apr+29+2024+08%3A05%3A54+GMT%2B0000&version=202209.1.0&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0&geolocation=PL%3B14&AwaitingReconsent=false',
        domain: '.otodom.pl',
        path: '/',
        expires: Date.now() / 1000 + 86400 * 7, // 7 дней в будущем
      }
    ]);
    
    console.log('✓ Cookies set to bypass consent banner');
    
    // Проходим через Referrer цепочку с задержками между переходами
    console.log('Starting natural navigation sequence...');
    
    // Шаг 1: Главная страница
    console.log('Step 1: Opening main page...');
    await page.goto('https://www.otodom.pl/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Добавляем случайную задержку
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 1000));
    
    // Сохраняем скриншот главной страницы
    await page.screenshot({ path: './logs/proxy_main.png' });
    console.log('✓ Main page loaded and screenshot saved');
    
    // Эмулируем человеческое поведение: случайные движения мыши, скроллинг
    await simulateHumanBehavior(page);
    
    // Шаг 2: Переход на страницу продаж напрямую
    console.log('Step 2: Navigating to sales page...');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/'
    });
    
    // Задержка
    await page.waitForTimeout(1500 + Math.floor(Math.random() * 1000));
    
    // Скриншот
    await page.screenshot({ path: './logs/proxy_sales.png' });
    console.log('✓ Sales page loaded and screenshot saved');
    
    // Эмулируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // Шаг 3: Переход на страницу квартир
    console.log('Step 3: Navigating to apartments page...');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/pl/oferty/sprzedaz'
    });
    
    // Задержка
    await page.waitForTimeout(1200 + Math.floor(Math.random() * 1000));
    
    // Скриншот
    await page.screenshot({ path: './logs/proxy_apartments.png' });
    console.log('✓ Apartments page loaded and screenshot saved');
    
    // Эмулируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // Шаг 4: Переход на страницу Варшавы
    console.log('Step 4: Navigating to Warsaw page...');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie'
    });
    
    // Задержка
    await page.waitForTimeout(1300 + Math.floor(Math.random() * 1000));
    
    // Скриншот
    await page.screenshot({ path: './logs/proxy_warsaw.png' });
    console.log('✓ Warsaw page loaded and screenshot saved');
    
    // Эмулируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // Шаг 5: Переход на страницу района
    console.log('Step 5: Navigating to district page...');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa'
    });
    
    // Задержка
    await page.waitForTimeout(1100 + Math.floor(Math.random() * 1000));
    
    // Скриншот
    await page.screenshot({ path: './logs/proxy_district.png' });
    console.log('✓ District page loaded and screenshot saved');
    
    // Эмулируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // Шаг 6: Финальный переход с параметрами
    console.log('Step 6: Navigating to final results page...');
    await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000,
      referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie'
    });
    
    // Задержка для полной загрузки
    await page.waitForTimeout(2000 + Math.floor(Math.random() * 1000));
    
    // Финальный скриншот
    await page.screenshot({ path: './logs/proxy_results.png' });
    console.log('✓ Final results page loaded and screenshot saved');
    
    // Получаем HTML страницы
    const pageContent = await page.content();
    
    // Проверяем на блокировку CloudFront
    const isBlocked = pageContent.includes('ERROR: The request could not be satisfied') || 
                     pageContent.includes('Request blocked') ||
                     pageContent.includes('Generated by cloudfront');
    
    // Сохраняем HTML для анализа
    fs.writeFileSync('./logs/proxy_page.html', pageContent);
    console.log('✓ Final page HTML saved for analysis');
    
    if (isBlocked) {
      console.log('❌ BLOCKED: CloudFront still blocking request!');
    } else {
      console.log('✓ SUCCESS: Page loaded without CloudFront blocking!');
    }
    
    // Извлекаем данные о ценах
    console.log('Extracting price data...');
    const data = await page.evaluate(() => {
      // Проверяем блокировку
      if (document.title.includes('ERROR') || document.body.innerText.includes('Request blocked')) {
        return { blocked: true, prices: [] };
      }
      
      // Проверяем наличие объявлений
      const articles = document.querySelectorAll('article');
      
      // Получаем информацию о количестве объявлений
      const countEl = document.querySelector('[data-cy="search.listing-panel.label"]');
      const count = countEl ? countEl.textContent : null;
      
      // Получаем цены используя разные селекторы
      const selectors = [
        '[data-cy="listing-item-price"]',
        '.css-s8lxhp',
        '.e1jyrtvq0',
        'article .css-1mojcj4 span',
        'article span[data-testid]',
        'article span[aria-label*="price"]'
      ];
      
      let foundPrices = [];
      let selectorResults = {};
      
      // Проверяем каждый селектор
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          selectorResults[selector] = elements.length;
          
          if (elements.length > 0) {
            const prices = Array.from(elements).map(el => {
              const text = el.textContent || '';
              return text.replace(/[^\d]/g, '');
            }).filter(p => p.length > 0);
            
            foundPrices = [...foundPrices, ...prices];
          }
        } catch (e) {
          selectorResults[selector] = `Error: ${e.message}`;
        }
      }
      
      // Также собираем информацию о площади
      const areaSelectors = [
        '[data-cy="listing-item-area"]',
        'article span[aria-label*="area"]',
        'article span[aria-label*="powierzchnia"]'
      ];
      
      let areas = [];
      let areaResults = {};
      
      for (const selector of areaSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          areaResults[selector] = elements.length;
          
          if (elements.length > 0) {
            const foundAreas = Array.from(elements).map(el => {
              const text = el.textContent || '';
              return text.replace(/[^\d,\.]/g, '').replace(',', '.');
            }).filter(a => a.length > 0);
            
            areas = [...areas, ...foundAreas];
          }
        } catch (e) {
          areaResults[selector] = `Error: ${e.message}`;
        }
      }
      
      return {
        blocked: false,
        articlesCount: articles.length,
        prices: foundPrices,
        areas: areas,
        count,
        selectorResults,
        areaResults,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log('Data extraction results:', data);
    
    // Подготавливаем результаты
    const pricesPerSqm = [];
    if (data.prices && data.areas && data.prices.length === data.areas.length) {
      data.prices.forEach((price, index) => {
        const area = parseFloat(data.areas[index]);
        if (area > 0) {
          pricesPerSqm.push(Math.round(parseInt(price) / area));
        }
      });
    }
    
    // Рассчитываем средние значения
    const avgPrice = data.prices && data.prices.length > 0 
      ? Math.round(data.prices.reduce((sum, p) => sum + parseInt(p), 0) / data.prices.length) 
      : 0;
      
    const avgPricePerSqm = pricesPerSqm.length > 0 
      ? Math.round(pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length) 
      : 0;
    
    // Сохраняем результаты в JSON
    const result = {
      timestamp: new Date().toISOString(),
      url: data.url || page.url(),
      isBlocked,
      count: data.count,
      pricesFound: data.prices ? data.prices.length : 0,
      prices: data.prices || [],
      areas: data.areas || [],
      pricesPerSqm,
      avgPrice,
      avgPricePerSqm,
      articlesCount: data.articlesCount || 0,
      countText: data.count || 'Not found',
      pageTitle: data.pageTitle || '',
      selectorResults: data.selectorResults || {},
      areaResults: data.areaResults || {}
    };
    
    fs.writeFileSync('./logs/proxy_results.json', JSON.stringify(result, null, 2));
    console.log('✓ Results saved to JSON file');
    
    // Закрываем браузер
    await browser.close();
    console.log('✓ Browser closed');
    console.log('==== TEST COMPLETED SUCCESSFULLY ====');
    
    return result;
  } catch (error) {
    console.error('==== ERROR IN PROXY BYPASS TEST ====');
    console.error(error);
    
    try {
      if (browser) await browser.close();
    } catch (e) {
      console.error('Error closing browser:', e);
    }
    
    return { error: String(error) };
  }
}

/**
 * Имитирует поведение реального пользователя: случайные движения мыши,
 * скроллинг и паузы между действиями
 */
async function simulateHumanBehavior(page) {
  try {
    console.log('Simulating human behavior...');
    
    // Случайное количество действий от 1 до 3
    const actionsCount = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < actionsCount; i++) {
      // Выбираем случайное действие
      const actionType = Math.floor(Math.random() * 3);
      
      switch (actionType) {
        case 0:
          // Движение мыши
          const x = 100 + Math.floor(Math.random() * 600);
          const y = 100 + Math.floor(Math.random() * 400);
          await page.mouse.move(x, y);
          break;
          
        case 1:
          // Скролл вниз
          const scrollDownDistance = 100 + Math.floor(Math.random() * 400);
          await page.evaluate((distance) => {
            window.scrollBy(0, distance);
          }, scrollDownDistance);
          break;
          
        case 2:
          // Скролл вверх (если не в начале страницы)
          const scrollUpDistance = Math.floor(Math.random() * 200);
          await page.evaluate((distance) => {
            if (window.scrollY > distance) {
              window.scrollBy(0, -distance);
            }
          }, scrollUpDistance);
          break;
      }
      
      // Пауза между действиями
      const pauseDuration = 200 + Math.floor(Math.random() * 500);
      await page.waitForTimeout(pauseDuration);
    }
    
    console.log(`✓ Simulated ${actionsCount} human-like actions`);
  } catch (error) {
    console.log('Error in human behavior simulation:', error);
  }
}

// Запускаем тест
proxyBypass()
  .then(result => {
    console.log('Proxy bypass completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error in proxy bypass:', err);
    process.exit(1);
  });