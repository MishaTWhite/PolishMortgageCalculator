// Специализированный тест для обхода CloudFront AntiBot защиты
import * as fs from 'fs';
import * as path from 'path';
import { chromium, devices } from 'playwright';

/**
 * Максимально правдоподобная эмуляция обычного пользователя
 * для обхода CloudFront антибот защиты
 */
async function cloudFrontBypassTest() {
  console.log('==== CLOUDFRONT BYPASS TEST ====');
  console.log('Starting test with specific CloudFront bypass techniques');
  
  let browser = null;
  try {
    // Используем предустановленное устройство для более реалистичной эмуляции
    const device = devices['Desktop Chrome'];
    
    // Аргументы запуска с минимальной автоматизацией
    const launchOptions = {
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
      ],
      timeout: 30000
    };
    
    console.log('Launching browser...');
    browser = await chromium.launch(launchOptions);
    
    // Создаем контекст, эмулирующий обычный Chrome на десктопе
    const context = await browser.newContext({
      ...device,
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      geolocation: { longitude: 21.0122, latitude: 52.2297 },
      permissions: ['geolocation'],
      ignoreHTTPSErrors: true,
      // Используем уникальный storage state для каждого запуска
      storageState: {
        cookies: [],
        origins: []
      }
    });
    
    console.log('✓ Browser context created with desktop device emulation');
    
    // Создаем страницу без дополнительных модификаций
    const page = await context.newPage();
    
    // Устанавливаем случайный User-Agent из популярных браузеров
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.2365.92',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    await page.setExtraHTTPHeaders({
      'User-Agent': randomUserAgent,
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    });
    
    console.log('✓ Page created with random user agent');
    
    // Подготовка к обходу обнаружения автоматизации
    await page.addInitScript(() => {
      // Скрываем признаки автоматизации
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'pl', 'en-US', 'en'] });
      
      // Создаем фейковый canvas fingerprint
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (type === 'image/png' && this.width === 16 && this.height === 16) {
          // Фейковые данные canvas fingerprint
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9bpaVUHOwg4pChOlkQFXHUKhShQqgVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi5Oik6CIl/q8ptIjx4Lgf7+497t4B/maVqWZwAlA1y8gkE0I+vyKEXhFGBBEiiCowpTNTzEJaDq7t+h4+XuNTns/7c/SrBYsBAZF4lhmmTbxBnNw0Tc77xFFWllXic+Ixky5I/Mh1xeM3zkWXBZ4ZNbPpeeIosVjqYrmLWdlQiaeJY6qmU76Q89jmvMVZq9ZY+578haGCvrLMdZpDSGIRSxAiIKCOCqqwkKBVI8VEmk7j+Yc9fpzohcGrkKtCjBHrp/AH/J7tWZyecpMCCaDrxbY/RoDQLtBq2Pb3sW23ToDAM3Bltf3VBjD9SXq9rUWOgL5t4OK6rcl7wOUO0P+kS4bkSAGa/nweeD+jb8oCfbdA95rbW3Mfpw9AmrpK3gAHh8BIgbLXfN7d3d7bv2ea/f0AM2NypkpT01QAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAADdcAAA3XAUIom3gAAAAHdElNRQfmBB0LKTHJ8tZjAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAApFJREFUOMttkl1ollUcxn//8z77bG+6iTbEphlCiSPBaTExGIVEjJAgSgkiiCAPvC16W3ZQlygMNAKJqIuCyDKKcBIkFYQK021q0IyxLNNm02nv3vf5v8/TRfmW0HM4nIvr4hf3dUQV6+HpC/5EPMGGBDp7g7mRIuWZGuWZiHJNU61FyhWlNKuUK0q5qoiqNLZKvq1J8kMzibHDE9z5SrLvdXfIEV66PcO7n17h0qVJQhRCVEIQQlBiUGJQQox/bxnIy3e1uuEDK2T9ehudO7/W4/PsO3iVD49cZaYS8FHxIuQElQQ3KK6YKe6KG4gJriRu9LW5vtUryeZtNzn8UT9mwu79o+x5f5KJ4tlxSJIx06WwdHmOzs4W1m3MuOsex/uKJAlXxoJ88NnEzIGPJ/jo8wH6h5RysYFCweOeUUjdtmrJsXnzCgLwgpPmUxpzjuaWlCRX3Kquc8ftFXa/m+Ouex33P5Ly1NN5Wlo9H7yRYZTStu0B8/6mNh7c1GTuDsUgmEE0IZgS67o4fLTIK7s9nXfnDPwVOXZkjKZCUlCkxGtPubtXLrX1T21MUNfKfJJqMOe/ftzIK7tT5i7L6DpXxrJpdnVVGf/bBAvpRzdl6+bHB3Pfns7sQhFViKqgCnH+pOKo0tdXxMwQc8TmCH28j+HBUFM6CzmvWZGrbnmCm5BLDrdENM1Fc9HM4+aIJZgJZoKrYKZ0nw9xsLeURAvOxaGxYn7JmiTEVUsSN5/gLrgLbkLwRDB878a70u6e2Vo0e/JMZdWmO9O1Z85Vv+76vrx7/9sT55Zvymld3YDSzJIQZ98lxNZLZfQ8esPDiwq8sCmzP86GF1RkadHtPOj/DXeOsNGEYEITAAAAAElFTkSuQmCC';
        }
        return originalToDataURL.apply(this, arguments);
      };
    });
    
    console.log('✓ Anti-automation detection bypass setup complete');
    
    // Устанавливаем cookie для обхода баннера согласия
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
      }
    ]);
    
    // Сначала посещаем главную страницу для установки cookies
    console.log('Visiting main page first...');
    await page.goto('https://www.otodom.pl/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Делаем естественную паузу
    await page.waitForTimeout(2000 + Math.floor(Math.random() * 1000));
    
    // Сохраняем скриншот главной страницы
    await page.screenshot({ path: './logs/cloudfront_main.png' });
    console.log('✓ Main page loaded successfully');
    
    // Получаем и сохраняем cookies после первой страницы
    const cookies = await context.cookies();
    fs.writeFileSync('./logs/cloudfront_cookies.json', JSON.stringify(cookies, null, 2));
    console.log(`✓ Saved ${cookies.length} cookies after main page`);
    
    // Имитируем человеческое поведение - двигаем мышь и скроллим
    for (let i = 0; i < 3; i++) {
      // Случайные движения мыши
      await page.mouse.move(
        100 + Math.floor(Math.random() * 500),
        100 + Math.floor(Math.random() * 300)
      );
      
      // Небольшая пауза
      await page.waitForTimeout(300 + Math.floor(Math.random() * 700));
      
      // Скролл с разной скоростью
      await page.evaluate(() => {
        window.scrollBy(0, 100 + Math.floor(Math.random() * 400));
      });
      
      await page.waitForTimeout(500 + Math.floor(Math.random() * 500));
    }
    
    console.log('✓ Simulated human-like mouse movements and scrolling');
    
    // Переход на страницу результатов через прямой URL с реферером
    console.log('Navigating to search results page...');
    
    // Принудительно устанавливаем referer из домена
    await page.setExtraHTTPHeaders({
      'Referer': 'https://www.otodom.pl/'
    });
    
    // Переходим на страницу поиска
    const targetUrl = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D&viewType=listing';
    
    // Используем клик по запросу, если есть нужная ссылка
    try {
      // Пытаемся найти подходящую ссылку и кликнуть на неё
      const linkExists = await page.evaluate((targetUrl) => {
        const links = Array.from(document.querySelectorAll('a'));
        for (const link of links) {
          if (link.href.includes('warszawa') || link.href.includes('mieszkanie')) {
            link.click();
            return true;
          }
        }
        return false;
      }, targetUrl);
      
      if (!linkExists) {
        console.log('No suitable link found, using direct navigation');
        await page.goto(targetUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      } else {
        console.log('✓ Clicked on matching link');
        await page.waitForTimeout(1500);
      }
    } catch (error) {
      console.log('Error with link click, using direct navigation', error);
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
    }
    
    // Добавляем небольшую задержку для полной загрузки
    await page.waitForTimeout(3000);
    
    // Сохраняем скриншот результатов
    await page.screenshot({ path: './logs/cloudfront_results.png' });
    console.log('✓ Results page loaded and screenshot saved');
    
    // Получаем HTML страницы
    const pageContent = await page.content();
    
    // Проверяем, получили ли мы блокировку от CloudFront
    const isBlocked = pageContent.includes('ERROR: The request could not be satisfied') || 
                      pageContent.includes('Request blocked') ||
                      pageContent.includes('Generated by cloudfront');
    
    // Сохраняем HTML для анализа
    fs.writeFileSync('./logs/cloudfront_page.html', pageContent);
    console.log('✓ Page HTML saved for analysis');
    
    if (isBlocked) {
      console.log('❌ BLOCKED: CloudFront still blocking our request!');
    } else {
      console.log('✓ SUCCESS: Page loaded without CloudFront blocking!');
    }
    
    // Пытаемся извлечь данные
    console.log('Extracting data from page...');
    const data = await page.evaluate(() => {
      // Проверяем блокировку
      if (document.title.includes('ERROR') || document.body.innerText.includes('Request blocked')) {
        return { blocked: true, prices: [] };
      }
      
      // Проверяем, есть ли объявления
      const articles = document.querySelectorAll('article');
      
      // Получаем цены используя разные селекторы
      const selectors = [
        '[data-cy="listing-item-price"]',
        '.css-s8lxhp',
        '.e1jyrtvq0',
        'article .css-1mojcj4 span',
        'article span[data-testid]',
        'article span[aria-label]'
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
      
      // Получаем количество объявлений
      const countEl = document.querySelector('[data-cy="search.listing-panel.label"]');
      const count = countEl ? countEl.textContent : null;
      
      return {
        blocked: false,
        articlesCount: articles.length,
        prices: foundPrices,
        count,
        selectorResults,
        pageTitle: document.title
      };
    });
    
    console.log('Data extraction results:', data);
    
    // Сохраняем результаты в JSON
    const result = {
      timestamp: new Date().toISOString(),
      url: targetUrl,
      isBlocked,
      pricesFound: data.prices ? data.prices.length : 0,
      prices: data.prices || [],
      articlesCount: data.articlesCount || 0,
      countText: data.count || 'Not found',
      pageTitle: data.pageTitle || '',
      selectorResults: data.selectorResults || {}
    };
    
    fs.writeFileSync('./logs/cloudfront_results.json', JSON.stringify(result, null, 2));
    console.log('✓ Results saved to JSON file');
    
    // Закрываем браузер
    await browser.close();
    console.log('✓ Browser closed');
    console.log('==== TEST COMPLETED SUCCESSFULLY ====');
    
    return result;
  } catch (error) {
    console.error('==== ERROR IN CLOUDFRONT BYPASS TEST ====');
    console.error(error);
    
    try {
      if (browser) await browser.close();
    } catch (e) {
      console.error('Error closing browser:', e);
    }
    
    return { error: String(error) };
  }
}

// Запускаем тест
cloudFrontBypassTest()
  .then(result => {
    console.log('CloudFront bypass test completed with result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error in CloudFront bypass test:', err);
    process.exit(1);
  });