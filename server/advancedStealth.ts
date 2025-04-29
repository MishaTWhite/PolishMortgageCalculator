// Продвинутый скрапер для обхода CloudFront защиты от ботов
// Использует пошаговую навигацию и эмуляцию реального пользователя
import * as fs from 'fs';
import * as path from 'path';
import { chromium, devices } from 'playwright';

/**
 * Продвинутый скрапер с реалистичным поведением пользователя
 * для обхода защиты CloudFront
 */
async function advancedStealthScraper() {
  console.log('==== ADVANCED STEALTH SCRAPER ====');
  console.log('Starting advanced stealth test with natural browser behavior');
  
  let browser = null;
  try {
    // Используем актуальное устройство для эмуляции
    const device = devices['Desktop Chrome'];
    
    // Более продвинутые опции запуска
    const launchOptions = {
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--window-size=1920,1080',
        '--disable-dev-shm-usage',
        '--lang=pl-PL',
        // Имитация графического ускорения
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--enable-zero-copy',
      ],
      timeout: 30000
    };
    
    console.log('Launching browser with advanced stealth options...');
    browser = await chromium.launch(launchOptions);
    
    // Создаем контекст с детальными настройками
    const context = await browser.newContext({
      ...device,
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      geolocation: { longitude: 21.0122, latitude: 52.2297 }, // Координаты Варшавы
      permissions: ['geolocation'],
      colorScheme: 'light',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true,
      bypassCSP: false, // Не обходим CSP, чтобы не выглядеть подозрительно
      javaScriptEnabled: true,
      hasTouch: false,
      isMobile: false,
      // Используем уникальный storage state с каждым запуском
      storageState: {
        cookies: [],
        origins: []
      }
    });
    
    console.log('✓ Browser context created with detailed device emulation');
    
    // Создаем страницу 
    const page = await context.newPage();
    
    // Устанавливаем актуальный User-Agent для Chrome на Windows
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    
    // Устанавливаем полный набор заголовков как у реального браузера
    await page.setExtraHTTPHeaders({
      'User-Agent': userAgent,
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-user': '?1',
      'sec-fetch-dest': 'document',
      'upgrade-insecure-requests': '1',
      'Connection': 'keep-alive',
      'DNT': '1',
      'Cache-Control': 'max-age=0'
    });
    
    console.log('✓ Page created with realistic browser headers');
    
    // Подготовка к обходу обнаружения автоматизации
    await page.addInitScript(() => {
      // Скрываем признаки автоматизации
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery(parameters);
      };
      
      // Скрываем webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Имитируем plugins
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
      
      // Имитируем languages
      Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'pl', 'en-US', 'en'] });
      
      // Имитируем deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      
      // Имитируем hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      
      // Модифицируем canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (type === 'image/png' && this.width === 16 && this.height === 16) {
          // Фейковые данные canvas fingerprint
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9bpaVUHOwg4pChOlkQFXHUKhShQqgVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi5Oik6CIl/q8ptIjx4Lgf7+497t4B/maVqWZwAlA1y8gkE0I+vyKEXhFGBBEiiCowpTNTzEJaDq7t+h4+XuNTns/7c/SrBYsBAZF4lhmmTbxBnNw0Tc77xFFWllXic+Ixky5I/Mh1xeM3zkWXBZ4ZNbPpeeIosVjqYrmLWdlQiaeJY6qmU76Q89jmvMVZq9ZY+578haGCvrLMdZpDSGIRSxAiIKCOCqqwkKBVI8VEmk7j+Yc9fpzohcGrkKtCjBHrp/AH/J7tWZyecpMCCaDrxbY/RoDQLtBq2Pb3sW23ToDAM3Bltf3VBjD9SXq9rUWOgL5t4OK6rcl7wOUO0P+kS4bkSAGa/nweeD+jb8oCfbdA95rbW3Mfpw9AmrpK3gAHh8BIgbLXfN7d3d7bv2ea/f0AM2NypkpT01QAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAADdcAAA3XAUIom3gAAAAHdElNRQfmBB0LKTHJ8tZjAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAApFJREFUOMttkl1ollUcxn//8z77bG+6iTbEphlCiSPBaTExGIVEjJAgSgkiiCAPvC16W3ZQlygMNAKJqIuCyDKKcBIkFYQK021q0IyxLNNm02nv3vf5v8/TRfmW0HM4nIvr4hf3dUQV6+HpC/5EPMGGBDp7g7mRIuWZGuWZiHJNU61FyhWlNKuUK0q5qoiqNLZKvq1J8kMzibHDE9z5SrLvdXfIEV66PcO7n17h0qVJQhRCVEIQQlBiUGJQYox/bxnIy3e1uuEDK2T9ehudO7/W4/PsO3iVD49cZaYS8FHxIuQElQQ3KK6YKe6KG4gJriRu9LW5vtUryeZtNzn8UT9mwu79o+x5f5KJ4tlxSJIx06WwdHmOzs4W1m3MuOsex/uKJAlXxoJ88NnEzIGPJ/jo8wH6h5RysYFCweOeUUjdtmrJsXnzCgLwgpPmUxpzjuaWlCRX3Kquc8ftFXa/m+Ouex33P5Ly1NN5Wlo9H7yRYZTStu0B8/6mNh7c1GTuDsUgmEE0IZgS67o4fLTIK7s9nXfnDPwVOXZkjKZCUlCkxGtPubtXLrX1T21MUNfKfJJqMOe/ftzIK7tT5i7L6DpXxrJpdnVVGf/bBAvpRzdl6+bHB3Pfns7sQhFViKqgCnH+pOKo0tdXxMwQc8TmCH28j+HBUFM6CzmvWZGrbnmCm5BLDrdENM1Fc9HM4+aIJZgJZoKrYKZ0nw9xsLeURAvOxaGxYn7JmiTEVUsSN5/gLrgLbkLwRDB878a70u6e2Vo0e/JMZdWmO9O1Z85Vv+76vrx7/9sT55Zvymld3YDSzJIQZ98lxNZLZfQ8esPDiwq8sCmzP86GF1RkadHtPOj/DXeOsNGEYEITAAAAAElFTkSuQmCC';
        }
        return originalToDataURL.apply(this, arguments);
      };
      
      // Имитируем WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Google Inc. (Intel)';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';
        }
        return getParameter.apply(this, arguments);
      };
    });
    
    console.log('✓ Advanced anti-detection setup complete');
    
    // Устанавливаем основные cookies до запроса
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    
    // Запуск таймера для общего отслеживания
    const startTime = Date.now();
    
    // Шаг 1: Посещаем главную страницу
    console.log('Step 1: Visiting main page...');
    await page.goto('https://www.otodom.pl/', { 
      waitUntil: 'networkidle',
      timeout: 25000
    });
    
    // Запись в лог времени загрузки первой страницы
    console.log(`Main page loaded in ${Date.now() - startTime}ms`);
    
    // Сохраняем скриншот главной страницы
    await page.screenshot({ path: './logs/stealth_main.png' });
    console.log('✓ Main page loaded and screenshot saved');
    
    // Паузы и движения мыши между действиями для естественного поведения
    await simulateHumanBehavior(page);
    
    // Шаг 2: Нажимаем на "Sprzedaż" (продажа)
    console.log('Step 2: Clicking on "Sprzedaż" link...');
    
    // Ищем разные варианты ссылок на продажу
    try {
      // Пробуем найти ссылку разными способами
      const salesLinkSelectors = [
        'a[href="/pl/oferty/sprzedaz"]',
        'a[data-cy*="sale"]',
        'a[href*="/sprzedaz"]',
        'a:has-text("Sprzedaż")'
      ];
      
      let clickSuccess = false;
      for (const selector of salesLinkSelectors) {
        if (await page.$(selector)) {
          // Перед кликом делаем скриншот чтобы увидеть ссылку
          await page.screenshot({ path: './logs/stealth_before_sales_click.png' });
          
          // Наводим мышь и кликаем
          await page.hover(selector);
          await page.waitForTimeout(300 + Math.floor(Math.random() * 500));
          await page.click(selector);
          
          // Ждем загрузки страницы
          await page.waitForLoadState('networkidle', { timeout: 20000 });
          
          console.log(`✓ Clicked on sales link with selector: ${selector}`);
          clickSuccess = true;
          break;
        }
      }
      
      if (!clickSuccess) {
        console.log('No sales link found, trying direct navigation');
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', {
          waitUntil: 'networkidle',
          timeout: 20000,
          referer: 'https://www.otodom.pl/'
        });
      }
    } catch (error) {
      console.log('Error clicking sales link, trying direct navigation:', error);
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', {
        waitUntil: 'networkidle',
        timeout: 20000,
        referer: 'https://www.otodom.pl/'
      });
    }
    
    // Сохраняем скриншот страницы после выбора "Продажа"
    await page.screenshot({ path: './logs/stealth_sales.png' });
    console.log('✓ Sales page loaded and screenshot saved');
    
    // Имитация естественного поведения
    await simulateHumanBehavior(page);
    
    // Шаг 3: Выбираем "Mieszkanie" (Квартиры)
    console.log('Step 3: Selecting "Mieszkanie" (Apartments)...');
    try {
      const apartmentSelectors = [
        'a[href*="/mieszkanie"]',
        'a[data-cy*="apartment"]',
        'a:has-text("Mieszkanie")'
      ];
      
      let clickSuccess = false;
      for (const selector of apartmentSelectors) {
        if (await page.$(selector)) {
          await page.hover(selector);
          await page.waitForTimeout(300 + Math.floor(Math.random() * 500));
          await page.click(selector);
          
          await page.waitForLoadState('networkidle', { timeout: 20000 });
          console.log(`✓ Clicked on apartment link with selector: ${selector}`);
          clickSuccess = true;
          break;
        }
      }
      
      if (!clickSuccess) {
        console.log('No apartment link found, trying direct navigation');
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', {
          waitUntil: 'networkidle',
          timeout: 20000,
          referer: 'https://www.otodom.pl/pl/oferty/sprzedaz'
        });
      }
    } catch (error) {
      console.log('Error clicking apartment link, trying direct navigation:', error);
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', {
        waitUntil: 'networkidle',
        timeout: 20000,
        referer: 'https://www.otodom.pl/pl/oferty/sprzedaz'
      });
    }
    
    // Сохраняем скриншот
    await page.screenshot({ path: './logs/stealth_apartments.png' });
    console.log('✓ Apartments page loaded and screenshot saved');
    
    // Имитация естественного поведения
    await simulateHumanBehavior(page);
    
    // Шаг 4: Выбираем Варшаву
    console.log('Step 4: Selecting Warsaw...');
    try {
      const warsawSelectors = [
        'a[href*="/warszawa"]',
        'a[data-cy*="warszawa"]',
        'a:has-text("Warszawa")'
      ];
      
      let clickSuccess = false;
      for (const selector of warsawSelectors) {
        if (await page.$(selector)) {
          // Перед кликом скриншот
          await page.screenshot({ path: './logs/stealth_before_warsaw_click.png' });
          
          await page.hover(selector);
          await page.waitForTimeout(300 + Math.floor(Math.random() * 500));
          await page.click(selector);
          
          await page.waitForLoadState('networkidle', { timeout: 20000 });
          console.log(`✓ Clicked on Warsaw link with selector: ${selector}`);
          clickSuccess = true;
          break;
        }
      }
      
      if (!clickSuccess) {
        console.log('No Warsaw link found, trying direct navigation');
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa', {
          waitUntil: 'networkidle',
          timeout: 20000,
          referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie'
        });
      }
    } catch (error) {
      console.log('Error clicking Warsaw link, trying direct navigation:', error);
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa', {
        waitUntil: 'networkidle',
        timeout: 20000,
        referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie'
      });
    }
    
    // Сохраняем скриншот
    await page.screenshot({ path: './logs/stealth_warsaw.png' });
    console.log('✓ Warsaw page loaded and screenshot saved');
    
    // Имитация естественного поведения
    await simulateHumanBehavior(page);
    
    // Шаг 5: Выбираем район Śródmieście
    console.log('Step 5: Selecting Śródmieście district...');
    try {
      const districtSelectors = [
        'a[href*="/srodmiescie"]',
        'a[data-cy*="srodmiescie"]',
        'a:has-text("Śródmieście")'
      ];
      
      let clickSuccess = false;
      for (const selector of districtSelectors) {
        if (await page.$(selector)) {
          await page.hover(selector);
          await page.waitForTimeout(300 + Math.floor(Math.random() * 500));
          await page.click(selector);
          
          await page.waitForLoadState('networkidle', { timeout: 20000 });
          console.log(`✓ Clicked on Śródmieście link with selector: ${selector}`);
          clickSuccess = true;
          break;
        }
      }
      
      if (!clickSuccess) {
        console.log('No Śródmieście link found, trying direct navigation');
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie', {
          waitUntil: 'networkidle',
          timeout: 20000,
          referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa'
        });
      }
    } catch (error) {
      console.log('Error clicking Śródmieście link, trying direct navigation:', error);
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie', {
        waitUntil: 'networkidle',
        timeout: 20000,
        referer: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa'
      });
    }
    
    // Сохраняем скриншот
    await page.screenshot({ path: './logs/stealth_district.png' });
    console.log('✓ District page loaded and screenshot saved');
    
    // Имитация естественного поведения
    await simulateHumanBehavior(page);
    
    // Шаг 6: Выбираем количество комнат (3 комнаты)
    console.log('Step 6: Selecting number of rooms (3 rooms)...');
    
    // Попытка найти и использовать фильтр комнат
    try {
      // Попробуем найти кнопку или выпадающий список для фильтра комнат
      const roomFilterSelectors = [
        '[data-cy*="room-filter"]', 
        '[data-testid*="rooms"]',
        'button:has-text("Liczba pokoi")',
        'div[role="button"]:has-text("Liczba pokoi")'
      ];
      
      let filterFound = false;
      for (const selector of roomFilterSelectors) {
        if (await page.$(selector)) {
          await page.screenshot({ path: './logs/stealth_before_room_filter.png' });
          
          await page.hover(selector);
          await page.waitForTimeout(300 + Math.floor(Math.random() * 500));
          await page.click(selector);
          
          await page.waitForTimeout(1000);
          console.log(`✓ Clicked on room filter with selector: ${selector}`);
          filterFound = true;
          
          // Теперь попробуем выбрать 3 комнаты
          const threeRoomSelectors = [
            '[data-cy*="three"]', 
            '[data-testid*="three"]',
            'label:has-text("3 pokoje")',
            'input[type="checkbox"][value="THREE"]'
          ];
          
          let roomSelected = false;
          for (const roomSelector of threeRoomSelectors) {
            if (await page.$(roomSelector)) {
              await page.hover(roomSelector);
              await page.waitForTimeout(300);
              await page.click(roomSelector);
              
              await page.waitForLoadState('networkidle', { timeout: 20000 });
              console.log(`✓ Selected 3 rooms with selector: ${roomSelector}`);
              roomSelected = true;
              break;
            }
          }
          
          if (!roomSelected) {
            console.log('Could not select 3 rooms, trying URL parameter');
          }
          
          break;
        }
      }
      
      if (!filterFound) {
        console.log('Room filter not found, using URL parameter');
      }
    } catch (error) {
      console.log('Error with room filter, using URL parameter:', error);
    }
    
    // В любом случае, для надежности переходим по прямому URL с параметром комнат
    const finalUrl = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D';
    const currentUrl = page.url();
    
    // Переходим по URL только если уже не содержит параметр комнат
    if (!currentUrl.includes('roomsNumber=%5BTHREE%5D')) {
      console.log('Navigating to URL with room parameter...');
      await page.goto(finalUrl, { 
        waitUntil: 'networkidle',
        timeout: 20000,
        referer: currentUrl
      });
    }
    
    // Сохраняем финальный скриншот
    await page.screenshot({ path: './logs/stealth_final_results.png' });
    console.log('✓ Final results page loaded and screenshot saved');
    
    // Добавляем небольшую задержку для полной загрузки
    await page.waitForTimeout(3000);
    
    // Проверка на наличие блокировки CloudFront
    const pageContent = await page.content();
    const isBlocked = pageContent.includes('ERROR: The request could not be satisfied') || 
                     pageContent.includes('Request blocked') ||
                     pageContent.includes('Generated by cloudfront');
    
    // Сохраняем HTML для анализа
    fs.writeFileSync('./logs/stealth_final_page.html', pageContent);
    console.log('✓ Final page HTML saved for analysis');
    
    if (isBlocked) {
      console.log('❌ BLOCKED: CloudFront still blocking our request!');
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
    
    // Объединяем цены и площади, рассчитываем цену за метр
    let pricesPerSqm = [];
    if (data.prices && data.areas && data.prices.length === data.areas.length) {
      pricesPerSqm = data.prices.map((price, index) => {
        const area = parseFloat(data.areas[index]);
        if (area > 0) {
          return Math.round(parseInt(price) / area);
        }
        return 0;
      }).filter(p => p > 0);
    }
    
    // Рассчитываем средние значения
    const avgPrice = data.prices && data.prices.length > 0 
      ? Math.round(data.prices.reduce((sum, p) => sum + parseInt(p), 0) / data.prices.length) 
      : 0;
      
    const avgPricePerSqm = pricesPerSqm.length > 0 
      ? Math.round(pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length) 
      : 0;
    
    // Сохраняем полные результаты в JSON
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
      areaResults: data.areaResults || {},
      executionTimeMs: Date.now() - startTime
    };
    
    fs.writeFileSync('./logs/stealth_results.json', JSON.stringify(result, null, 2));
    console.log('✓ Results saved to JSON file');
    
    // Закрываем браузер
    await browser.close();
    console.log('✓ Browser closed');
    console.log(`==== TEST COMPLETED SUCCESSFULLY in ${Date.now() - startTime}ms ====`);
    
    return result;
  } catch (error) {
    console.error('==== ERROR IN ADVANCED STEALTH TEST ====');
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
    
    // Случайное количество действий
    const actionsCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < actionsCount; i++) {
      // Создаем случайную последовательность действий
      const actions = [
        // Случайное движение мыши
        async () => {
          const x = 100 + Math.floor(Math.random() * 600);
          const y = 100 + Math.floor(Math.random() * 400);
          await page.mouse.move(x, y);
          console.log(`  Mouse moved to ${x},${y}`);
        },
        
        // Плавный скролл
        async () => {
          const scrollDistance = 100 + Math.floor(Math.random() * 400);
          await page.evaluate((distance) => {
            window.scrollBy({ top: distance, left: 0, behavior: 'smooth' });
          }, scrollDistance);
          console.log(`  Scrolled down ${scrollDistance}px`);
        },
        
        // Быстрый скролл вниз
        async () => {
          const scrollDistance = 400 + Math.floor(Math.random() * 600);
          await page.evaluate((distance) => {
            window.scrollBy(0, distance);
          }, scrollDistance);
          console.log(`  Quick scroll down ${scrollDistance}px`);
        },
        
        // Скролл вверх
        async () => {
          const scrollDistance = -(100 + Math.floor(Math.random() * 300));
          await page.evaluate((distance) => {
            window.scrollBy({ top: distance, left: 0, behavior: 'smooth' });
          }, scrollDistance);
          console.log(`  Scrolled up ${-scrollDistance}px`);
        }
      ];
      
      // Выполняем случайное действие
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      await randomAction();
      
      // Делаем случайную паузу между действиями
      const pauseDuration = 300 + Math.floor(Math.random() * 1000);
      await page.waitForTimeout(pauseDuration);
    }
    
    // Финальная пауза
    const finalPause = 1000 + Math.floor(Math.random() * 1000);
    await page.waitForTimeout(finalPause);
    console.log(`✓ Human behavior simulation completed (${actionsCount} actions)`);
  } catch (error) {
    console.log('Error in human behavior simulation:', error);
  }
}

// Запускаем скрапер
advancedStealthScraper()
  .then(result => {
    console.log('Advanced stealth scraper completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error in advanced stealth scraper:', err);
    process.exit(1);
  });