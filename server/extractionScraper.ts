/**
 * Extraction Scraper
 * 
 * Версия скрапера для Otodom, фокусирующаяся на детальном извлечении данных
 * из листингов недвижимости. Использует метод session hijacking для обхода
 * защиты CloudFront и извлекает подробную информацию по каждому объявлению.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

// Константы
const LOG_DIR = './logs/extraction_scraper';
const RESULTS_DIR = './scraper_results';
const TIMEOUT_MS = 45000; // 45 секунд на всё про всё
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_DISTRICT = 'srodmiescie';
const TARGET_ROOMS = 'THREE'; // ONE, TWO, THREE, FOUR
const MAX_RETRIES = 2;

// Создаем необходимые директории
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Специфическая директория для текущего запуска
const RUN_ID = Date.now().toString();
const RUN_DIR = path.join(LOG_DIR, RUN_ID);
if (!fs.existsSync(RUN_DIR)) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
}

// Функция для логирования
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(path.join(RUN_DIR, 'log.txt'), formattedMessage + '\n');
}

// Функция для загрузки cookies и localStorage из файла
function loadSession(): { cookies: any[], localStorage: Record<string, string> } {
  try {
    const fileContent = fs.readFileSync(COOKIES_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to load session from file: ${(error as Error).message}`);
  }
}

// Структура данных о недвижимости
interface PropertyListing {
  title: string;
  price: {
    value: number;
    text: string;
  };
  area: {
    value: number;
    text: string;
  };
  pricePerSqm: {
    value: number;
    text: string;
  };
  address: string;
  url: string;
}

// Результат скрапинга
interface ScrapingResult {
  articlesCount: number;
  countText: string | null;
  listings: PropertyListing[];
  avgPrice: number;
  avgArea: number;
  avgPricePerSqm: number;
}

// Основная функция скрапера
async function extractionScraper(): Promise<void> {
  log('=== STARTING EXTRACTION SCRAPER ===');
  
  // Формируем целевой URL
  const targetUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${TARGET_DISTRICT}?roomsNumber=%5B${TARGET_ROOMS}%5D`;
  log(`Target URL: ${targetUrl}`);
  
  // Глобальный таймаут
  const timeoutId = setTimeout(() => {
    log('⚠️ TIMEOUT: Global execution time exceeded');
    process.exit(1);
  }, TIMEOUT_MS);
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // 1. Загружаем данные сессии из файла
    log('Loading session data from file...');
    const { cookies, localStorage } = loadSession();
    log(`✓ Loaded ${cookies.length} cookies and ${Object.keys(localStorage).length} localStorage items`);
    
    // 2. Запускаем браузер с оптимизированными настройками для Replit
    log('Launching browser with optimized settings...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--window-size=1366,768',
        '--single-process',
        '--no-zygote'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 30000
    });
    log('✓ Browser launched successfully');
    
    // 3. Создаем контекст с хорошими настройками под польского пользователя
    log('Creating optimized browser context...');
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      geolocation: { longitude: 21.0122, latitude: 52.2297 },
      viewport: { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
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
        'DNT': '1',
        'Referer': 'https://www.otodom.pl/'
      }
    });
    log('✓ Context created successfully');
    
    // 4. Добавляем cookies из файла
    log('Setting cookies from manual session...');
    await context.addCookies(cookies);
    log('✓ Cookies set successfully');
    
    // 5. Создаем страницу с антидетектом
    log('Creating stealth page...');
    page = await context.newPage();
    
    // 6. Добавляем продвинутый скрипт антидетекта
    await page.addInitScript(() => {
      // Webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Plugins 
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ];
      
      // Подделка plugins.__proto__
      const pluginProto = {
        item: function(index: number) { return plugins[index]; },
        namedItem: function(name: string) { return plugins.find(p => p.name === name); },
        refresh: function() {}
      };
      
      // @ts-ignore - Это необходимо для подмены прототипа
      Object.setPrototypeOf(plugins, pluginProto);
      Object.defineProperty(navigator, 'plugins', { 
        get: () => plugins,
        enumerable: true
      });
      
      // Languages
      Object.defineProperty(navigator, 'languages', { 
        get: () => ['pl-PL', 'pl', 'en-US', 'en'],
        enumerable: true
      });
      
      // Hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      
      // Device memory
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      
      // WebGL fingerprinting
      if (typeof WebGLRenderingContext !== 'undefined') {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) return 'Intel Inc.';
          if (parameter === 37446) return 'Intel Iris OpenGL Engine';
          return getParameter.apply(this, arguments);
        };
      }
      
      // Canvas fingerprinting
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        // Дополнительная защита от детекта через canvas fingerprinting
        if (type === 'image/png' && this.width === 16 && this.height === 16) {
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAvFJREFUOE9tk21Im1cUx3/PY2LUmJe5vERFTFwTq2ub+rb5UrYlzmkrTYgO2qavY3R0tLQDh1o2ugXXdivi3DbWdg5aWzZwrLQFi8UXNqlpJcE0S5pGjTE1Mc/Lnufc5jrpDvefy7n3/O///M/5S56j9vb2qtraWqLL6SZnD37Htp8ZRHNzcyiRSKQty/Jvbm5+0tfX9yfA/Pw8NTU1Rw4PDx8HPgQ8wCxwKxwOu1KpVNrv95d1dnZ+A6gM8Pbw8PDAwsLCqWg0OuHz+V7t6el5Z3R0tGFmZmYolUqtq6qa2+12ydSBYDD4NSAZgLS1tV1ZXFy8Pjc3d9/j8dQCzM7Ojjmdzlc8Ho+7qqoKj8fD1NTU4vj4+HnDMA6qqqqui8fjVFdX84wDTdO+SSaT9wayzv7r6upqbG9v/1DX9ZsVFRXEYjFaWlquOhyOT/b29m77/f6heDx+nwFcLtcgcC+ZTA45nc7X/H5/zO/3r+/s7LwUCAQMXdex2WwMDw9/oapqsLy8nN3dXUZGRt4H3mKAUCj0GbBtWdZ7gUBgMhAILMXj8aeCwaBZWlrK1tYW/f39HxiG8UksFkNEGB0d/Qj4jAE6OjqeBNLApWAwOBsMBgd1Xf9Q07Qyp9N5fH19nYmJialUKtVsGAaaplFcXMzo6Oh7DQ0NTR0dHWngxWO1bt68ORcKhZodDofH6/VSWFhIMplkcnLyoLCw8E/LsggEAnR1dWG327l79y63bt1aJXtkjzVobW09tbKycnF6evpnXdfL8/LycLlcmKapnD59+qzP58sH2NjYYGlp6UFlZeUfjY2NfwHqMUBTU9OjwFZeXt4Vwzjyq6p6CUDTNEcsFnuiuLg4D2B/f5+jo6PJmzdvXkgkEisulysbIBwOnzx37tyEUBi45i6qqqpa1TTNGwqF8vPz8wE4PDxEKcUfdzKXNjbuAKUMcHBwQENDQychZZ5aVm3//v3FUCjUF41GbxcUFEg6nVZHR0e/7adWfo7FL4ExBsjEvjg6cuVp4H9T/ZwqAWC44QAAAABJRU5ErkJggg==';
        }
        return toDataURL.apply(this, arguments);
      };
      
      // Chrome automation props
      window.chrome = {
        app: {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
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
          PlatformOs: {
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            MAC: 'mac',
            OPENBSD: 'openbsd',
            WIN: 'win'
          }
        }
      };
    });
    log('✓ Enhanced anti-detection applied');
    
    // 7. Устанавливаем localStorage до загрузки страницы
    log('Preparing localStorage script...');
    const localStorageScript = Object.entries(localStorage)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => `localStorage.setItem('${key}', '${String(value).replace(/'/g, "\\'")}');`)
      .join('\n');
    
    await page.addInitScript(`() => {
      ${localStorageScript}
    }`);
    log('✓ localStorage script prepared');
    
    // 8. Добавляем обработчик ошибок
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        log(`Console ${msg.type()}: ${msg.text()}`);
      }
    });
    
    // 9. Переходим прямо на целевую страницу
    log(`Navigating directly to target URL: ${targetUrl}`);
    
    // Добавляем повторные попытки
    let success = false;
    let attempt = 0;
    let response = null;
    let error = null;
    
    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      try {
        log(`Attempt ${attempt}/${MAX_RETRIES} to load page`);
        
        response = await page.goto(targetUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        
        if (response) {
          success = true;
          log(`✓ Page loaded with status: ${response.status()}`);
        } else {
          log(`⚠️ No response received on attempt ${attempt}`);
        }
      } catch (e) {
        error = e;
        log(`❌ Error on attempt ${attempt}: ${(e as Error).message}`);
        
        // Если это не последняя попытка, ждем перед следующей
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // Экспоненциальная задержка
          log(`Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!success) {
      throw new Error(`Failed to load page after ${MAX_RETRIES} attempts: ${error?.message}`);
    }
    
    // 10. Установка localStorage после загрузки страницы
    log('Setting localStorage post-navigation...');
    await page.evaluate((storageItems) => {
      for (const [key, value] of Object.entries(storageItems)) {
        if (value !== null) {
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            console.error(`Failed to set localStorage for ${key}:`, e);
          }
        }
      }
    }, localStorage);
    log('✓ localStorage set successfully');
    
    // 11. Получаем заголовок страницы
    const pageTitle = await page.title();
    log(`Page title: ${pageTitle}`);
    
    // 12. Делаем скриншот страницы
    const screenshotPath = path.join(RUN_DIR, 'result.png');
    await page.screenshot({ path: screenshotPath });
    log(`✓ Screenshot saved to: ${screenshotPath}`);
    
    // 13. Сохраняем HTML страницы
    const htmlPath = path.join(RUN_DIR, 'result.html');
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);
    log(`✓ HTML saved to: ${htmlPath}`);
    
    // 14. Проверяем на признаки блокировки CloudFront
    const isBlocked = html.includes('ERROR: The request could not be satisfied') || 
                      html.includes('Request blocked') ||
                      html.includes('Generated by cloudfront') ||
                      html.includes('Access Denied');
    
    if (isBlocked) {
      log('❌ BLOCKED: CloudFront protection detected!');
      fs.writeFileSync(path.join(RUN_DIR, 'cloudfront_block.txt'), 'CloudFront Block Detected');
      
      return; // Прекращаем выполнение, так как страница заблокирована
    } else {
      log('✅ SUCCESS: No CloudFront blocking detected!');
    }
    
    // 15. Проверяем наличие объявлений на странице
    const articleCount = await page.evaluate(() => document.querySelectorAll('article').length);
    log(`Found ${articleCount} article elements on page`);
    
    // Если объявлений нет, сохраняем диагностическую информацию
    if (articleCount === 0) {
      log('❌ No property listings found! Saving diagnostic information...');
      
      // Сохраняем скриншот
      const noListingsScreenshotPath = path.join(LOG_DIR, 'no_listings.png');
      await page.screenshot({ path: noListingsScreenshotPath, fullPage: true });
      log(`Screenshot of empty page saved to: ${noListingsScreenshotPath}`);
      
      // Сохраняем HTML
      const noListingsHtmlPath = path.join(LOG_DIR, 'no_listings.html');
      fs.writeFileSync(noListingsHtmlPath, html);
      log(`HTML of empty page saved to: ${noListingsHtmlPath}`);
      
      return; // Прекращаем выполнение, так как объявлений нет
    }
    
    // 16. Извлекаем данные о недвижимости
    log('Extracting detailed property data...');
    
    const scrapedData: ScrapingResult = await page.evaluate(() => {
      // Вспомогательные функции для очистки и форматирования данных
      const cleanPrice = (str: string | null | undefined): number => {
        const cleaned = str?.replace(/[^\d]/g, '');
        return cleaned ? parseInt(cleaned) : 0;
      };
      
      const cleanArea = (str: string | null | undefined): number => {
        const cleaned = str?.replace(/[^\d.,]/g, '').replace(',', '.');
        return cleaned ? parseFloat(cleaned) : 0;
      };
      
      const formatPriceText = (priceAsNumber: number): string => {
        return new Intl.NumberFormat('pl-PL').format(priceAsNumber) + ' zł';
      };
      
      const formatAreaText = (areaAsNumber: number): string => {
        return areaAsNumber.toFixed(1).replace('.', ',') + ' m²';
      };
      
      // Проверка наличия объявлений
      const articles = document.querySelectorAll('article');
      
      // Получение текста счетчика
      const countElement = document.querySelector('[data-cy="search.listing-panel.label"]');
      const countText = countElement ? countElement.textContent?.trim() : null;
      
      // Селекторы для извлечения данных
      const selectors = {
        title: [
          'article h3', 
          '[data-cy="listing-item-title"]', 
          '.css-1rhbnlm',
          'article .css-1r0si1e'
        ],
        price: [
          '[data-cy="listing-item-price"]',
          '.css-s8lxhp',
          '.e1jyrtvq0',
          'article .css-1mojcj4 span',
          'article span[data-testid]',
          'article span[aria-label*="price"]'
        ],
        area: [
          '[data-cy="listing-item-area"]',
          'article span[aria-label*="area"]',
          'article span[aria-label*="powierzchnia"]',
          'article .css-1dyvuwm'
        ],
        address: [
          '[data-cy="listing-item-address"]',
          'article p',
          'article .css-19fzh93',
          'article .css-1en4bli',
          'article div[aria-label*="address"]'
        ],
        url: [
          'article a',
          '[data-cy="listing-item-link"]'
        ]
      };
      
      // Извлечение данных из каждого объявления
      const listings = Array.from(articles).map(article => {
        let titleText = '';
        let priceValue = 0;
        let priceText = '';
        let areaValue = 0;
        let areaText = '';
        let addressText = '';
        let urlHref = '';
        
        // Извлечение заголовка
        for (const selector of selectors.title) {
          try {
            const element = article.querySelector(selector);
            if (element && element.textContent) {
              titleText = element.textContent.trim();
              break;
            }
          } catch (e) {}
        }
        
        // Извлечение цены
        for (const selector of selectors.price) {
          try {
            const element = article.querySelector(selector);
            if (element && element.textContent) {
              priceText = element.textContent.trim();
              priceValue = cleanPrice(priceText);
              if (priceValue > 0) break;
            }
          } catch (e) {}
        }
        
        // Извлечение площади
        for (const selector of selectors.area) {
          try {
            const element = article.querySelector(selector);
            if (element && element.textContent) {
              areaText = element.textContent.trim();
              areaValue = cleanArea(areaText);
              if (areaValue > 0) break;
            }
          } catch (e) {}
        }
        
        // Извлечение адреса
        for (const selector of selectors.address) {
          try {
            const element = article.querySelector(selector);
            if (element && element.textContent) {
              const text = element.textContent.trim();
              // Игнорируем короткие или числовые строки (вероятно, не адрес)
              if (text.length > 3 && !/^\d+$/.test(text)) {
                addressText = text;
                break;
              }
            }
          } catch (e) {}
        }
        
        // Извлечение URL
        for (const selector of selectors.url) {
          try {
            const element = article.querySelector(selector) as HTMLAnchorElement;
            if (element && element.href) {
              urlHref = element.href;
              break;
            }
          } catch (e) {}
        }
        
        // Расчет цены за квадратный метр
        let pricePerSqm = 0;
        let pricePerSqmText = '';
        if (priceValue > 0 && areaValue > 0) {
          pricePerSqm = Math.round(priceValue / areaValue);
          pricePerSqmText = formatPriceText(pricePerSqm) + '/m²';
        }
        
        // Форматирование цены и площади, если они числовые, но текст не был найден
        if (priceValue > 0 && !priceText) {
          priceText = formatPriceText(priceValue);
        }
        
        if (areaValue > 0 && !areaText) {
          areaText = formatAreaText(areaValue);
        }
        
        // Возвращаем структурированные данные
        return {
          title: titleText,
          price: {
            value: priceValue,
            text: priceText
          },
          area: {
            value: areaValue,
            text: areaText
          },
          pricePerSqm: {
            value: pricePerSqm,
            text: pricePerSqmText
          },
          address: addressText,
          url: urlHref
        };
      }).filter(item => item.title && item.price.value > 0); // Фильтруем только объявления с заголовком и ценой
      
      // Расчет средних значений
      const prices = listings.map(item => item.price.value);
      const areas = listings.map(item => item.area.value).filter(area => area > 0);
      const pricesPerSqm = listings.map(item => item.pricePerSqm.value).filter(price => price > 0);
      
      const avgPrice = prices.length > 0 
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length) 
        : 0;
        
      const avgArea = areas.length > 0 
        ? Math.round(areas.reduce((sum, a) => sum + a, 0) / areas.length * 10) / 10 
        : 0;
        
      const avgPricePerSqm = pricesPerSqm.length > 0 
        ? Math.round(pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length) 
        : 0;
      
      return {
        articlesCount: articles.length,
        countText,
        listings,
        avgPrice,
        avgArea,
        avgPricePerSqm
      };
    });
    
    // Выводим результаты в лог
    log(`Found ${scrapedData.articlesCount} article elements, extracted ${scrapedData.listings.length} valid listings`);
    log(`Count text: ${scrapedData.countText || 'Not found'}`);
    
    if (scrapedData.listings.length > 0) {
      log(`Average price: ${scrapedData.avgPrice} PLN`);
      log(`Average area: ${scrapedData.avgArea} m²`);
      log(`Average price per m²: ${scrapedData.avgPricePerSqm} PLN/m²`);
      
      // Показываем примеры найденных объявлений
      log('\nFirst 3 listings examples:');
      const examples = scrapedData.listings.slice(0, 3);
      for (const [i, example] of examples.entries()) {
        log(`Example ${i+1}:`);
        log(`  Title: ${example.title}`);
        log(`  Price: ${example.price.text} (${example.price.value})`);
        log(`  Area: ${example.area.text} (${example.area.value})`);
        log(`  Price per m²: ${example.pricePerSqm.text || 'N/A'}`);
        log(`  Address: ${example.address || 'N/A'}`);
        log(`  URL: ${example.url || 'N/A'}`);
      }
      
      // Сохраняем результаты в отдельный JSON-файл
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const resultsPath = path.join(RESULTS_DIR, `final_scraper_data_${timestamp}.json`);
      
      fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        url: targetUrl,
        district: TARGET_DISTRICT,
        roomType: TARGET_ROOMS,
        data: scrapedData
      }, null, 2));
      
      log(`\n✅ Results saved to: ${resultsPath}`);
    } else {
      log('❌ No valid listings found on the page!');
      
      // Сохраняем дополнительную диагностическую информацию
      const noListingsJsonPath = path.join(LOG_DIR, 'no_valid_listings.json');
      fs.writeFileSync(noListingsJsonPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        url: targetUrl,
        pageTitle,
        articlesCount: scrapedData.articlesCount,
        countText: scrapedData.countText,
        html_length: html.length,
        html_snippet: html.substring(0, 1000) + '...'
      }, null, 2));
      
      log(`Diagnostic information saved to: ${noListingsJsonPath}`);
    }
    
    // 17. Итоговый отчет
    log('\n=== SCRAPER RESULTS SUMMARY ===');
    log(`Target URL: ${targetUrl}`);
    log(`CloudFront blocked: ${isBlocked}`);
    log(`Listings found: ${scrapedData.listings.length} / ${scrapedData.articlesCount}`);
    
    if (!isBlocked && scrapedData.listings.length > 0) {
      log('VERDICT: SUCCESS! Successfully retrieved property data using session hijacking');
    } else if (!isBlocked && scrapedData.articlesCount > 0) {
      log('VERDICT: PARTIAL SUCCESS - Not blocked, found articles but couldn\'t extract valid listings');
    } else if (!isBlocked) {
      log('VERDICT: PARTIAL SUCCESS - Not blocked, but no listings found');
    } else {
      log('VERDICT: FAILURE - CloudFront protection still active');
    }
    
  } catch (error) {
    log(`❌ ERROR: ${(error as Error).message}`);
    
    // Сохраняем стек ошибки
    fs.writeFileSync(
      path.join(RUN_DIR, 'error.txt'), 
      `${(error as Error).message}\n\n${(error as Error).stack || 'No stack trace available'}`
    );
    
    // Делаем скриншот ошибки, если страница доступна
    if (page) {
      try {
        const errorScreenshotPath = path.join(RUN_DIR, 'error.png');
        await page.screenshot({ path: errorScreenshotPath });
        log(`Error screenshot saved to: ${errorScreenshotPath}`);
      } catch (e) {
        log(`Failed to save error screenshot: ${(e as Error).message}`);
      }
    }
  } finally {
    // Очистка ресурсов
    clearTimeout(timeoutId);
    
    if (page) {
      try {
        await page.close();
        log('Page closed');
      } catch (e) {
        log(`Error closing page: ${(e as Error).message}`);
      }
    }
    
    if (context) {
      try {
        await context.close();
        log('Context closed');
      } catch (e) {
        log(`Error closing context: ${(e as Error).message}`);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
        log('Browser closed');
      } catch (e) {
        log(`Error closing browser: ${(e as Error).message}`);
      }
    }
    
    log('All resources cleaned up');
    log('=== SCRAPER FINISHED ===');
  }
}

// Запускаем скрапер
extractionScraper()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });