/**
 * Enhanced Stealth Scraper
 * 
 * Улучшенная версия скрапера с усиленной защитой от обнаружения
 * и оптимизацией работы в среде Replit.
 * 
 * Основные улучшения:
 * - Более продвинутый обход отпечатка браузера
 * - Реалистичное поведение пользователя
 * - Оптимизированное управление ресурсами
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

// Глобальные константы и настройки
const LOG_DIR = './logs/enhanced_stealth';
const TIMEOUT_MS = 60000; // 60 секунд на выполнение
const DISTRICT = 'srodmiescie';
const ROOM_TYPE = 'THREE'; // ONE, TWO, THREE, FOUR

// Генерируем ID задания
const TASK_ID = `task_${Date.now()}`;

// Создаем директорию для логов
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Функция логирования
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(path.join(LOG_DIR, `${TASK_ID}.log`), formattedMessage + '\n');
}

// Основная функция скрапера
async function enhancedStealthScraper(): Promise<void> {
  log('=== STARTING ENHANCED STEALTH SCRAPER ===');
  
  // Глобальный таймаут
  const timeoutId = setTimeout(() => {
    log('⚠️ GLOBAL TIMEOUT REACHED: Terminating process');
    process.exit(1);
  }, TIMEOUT_MS);
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // 1. Выбираем случайный польский User-Agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.65',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0',
    ];
    
    // Рандомный User-Agent
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // Случайное разрешение экрана из типичных для десктопа
    const screenResolutions = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1680, height: 1050 }
    ];
    
    const screenSize = screenResolutions[Math.floor(Math.random() * screenResolutions.length)];
    
    // 2. Запускаем браузер с оптимизированными настройками
    log('Launching browser with optimized settings...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process,CookieNotificationV2',
        `--window-size=${screenSize.width},${screenSize.height}`,
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--lang=pl-PL',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 30000
    });
    log('✅ Browser launched successfully');
    
    // 3. Создаем контекст с усиленной маскировкой
    log('Creating enhanced stealth context...');
    context = await browser.newContext({
      userAgent,
      viewport: screenSize,
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      geolocation: { 
        // Координаты в центре Варшавы
        longitude: 21.0122, 
        latitude: 52.2297 
      },
      permissions: ['geolocation'],
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none', // Будет переопределен позже
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'DNT': '1',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive'
      }
    });
    log('✅ Context created with polish user profile');
    
    // 4. Создаем страницу и добавляем продвинутый скрипт анти-детекта
    log('Preparing page with advanced anti-detection...');
    page = await context.newPage();
    
    // 5. Продвинутый скрипт анти-детекта
    await page.addInitScript(() => {
      // WebDriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Плагины и мимы
      const makePlugins = () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ];
        
        const mimeTypes = [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ];
        
        // Подделываем плагины
        const pluginProto = {
          __proto__: {
            item: function(index: number) { return this[index]; },
            namedItem: function(name: string) { return this[name] || null; },
            refresh: function() {}
          }
        };
        
        plugins.forEach(plugin => {
          plugin.__proto__ = pluginProto.__proto__;
        });
        
        // Подделываем mimeTypes
        const mimeTypeProto = {
          __proto__: {
            item: function(index: number) { return this[index]; },
            namedItem: function(name: string) { return this[name] || null; }
          }
        };
        
        mimeTypes.forEach(mime => {
          mime.__proto__ = mimeTypeProto.__proto__;
        });
        
        return { plugins, mimeTypes };
      };
      
      const { plugins, mimeTypes } = makePlugins();
      
      // Переопределяем navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => plugins,
        enumerable: true,
        configurable: false
      });
      
      // Переопределяем navigator.mimeTypes
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => mimeTypes,
        enumerable: true,
        configurable: false
      });
      
      // Языки
      Object.defineProperty(navigator, 'languages', { 
        get: () => ['pl-PL', 'pl', 'en-US', 'en'],
        enumerable: true,
        configurable: false
      });
      
      // Характеристики устройства
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      
      // WebGL fingerprinting
      const getParameterProxyHandler = {
        apply: function(target, ctx, args) {
          const param = args[0];
          
          // UNMASKED_VENDOR_WEBGL
          if (param === 37445) {
            return 'Google Inc. (NVIDIA)';
          }
          
          // UNMASKED_RENDERER_WEBGL
          if (param === 37446) {
            return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0, D3D11)';
          }
          
          return Reflect.apply(target, ctx, args);
        }
      };
      
      if (typeof WebGLRenderingContext !== 'undefined') {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = new Proxy(getParameter, getParameterProxyHandler);
      }
      
      // Canvas fingerprinting
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;
      const getImageData = CanvasRenderingContext2D.prototype.getImageData;
      
      // Обфускация Canvas для предотвращения отпечатка
      HTMLCanvasElement.prototype.toDataURL = function() {
        if (this.width === 16 && this.height === 16) {
          // Подделка fingerprint Canvas
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAvFJREFUOE9tk21Im1cUx3/PY2LUmJe5vERFTFwTq2ub+rb5UrYlzmkrTYgO2qavY3R0tLQDh1o2ugXXdivi3DbWdg5aWzZwrLQFi8UXNqlpJcE0S5pGjTE1Mc/Lnufc5jrpDvefy7n3/O///M/5S56j9vb2qtraWqLL6SZnD37Htp8ZRHNzcyiRSKQty/Jvbm5+0tfX9yfA/Pw8NTU1Rw4PDx8HPgQ8wCxwKxwOu1KpVNrv95d1dnZ+A6gM8Pbw8PDAwsLCqWg0OuHz+V7t6el5Z3R0tGFmZmYolUqtq6qa2+12ydSBYDD4NSAZgLS1tV1ZXFy8Pjc3d9/j8dQCzM7Ojjmdzlc8Ho+7qqoKj8fD1NTU4vj4+HnDMA6qqqqui8fjVFdX84wDTdO+SSaT9wayzv7r6upqbG9v/1DX9ZsVFRXEYjFaWlquOhyOT/b29m77/f6heDx+nwFcLtcgcC+ZTA45nc7X/H5/zO/3r+/s7LwUCAQMXdex2WwMDw9/oapqsLy8nN3dXUZGRt4H3mKAUCj0GbBtWdZ7gUBgMhAILMXj8aeCwaBZWlrK1tYW/f39HxiG8UksFkNEGB0d/Qj4jAE6OjqeBNLApWAwOBsMBgd1Xf9Q07Qyp9N5fH19nYmJialUKtVsGAaaplFcXMzo6Oh7DQ0NTR0dHWngxWO1bt68ORcKhZodDofH6/VSWFhIMplkcnLyoLCw8E/LsggEAnR1dWG327l79y63bt1aJXtkjzVobW09tbKycnF6evpnXdfL8/LycLlcmKapnD59+qzP58sH2NjYYGlp6UFlZeUfjY2NfwHqMUBTU9OjwFZeXt4Vwzjyq6p6CUDTNEcsFnuiuLg4D2B/f5+jo6PJmzdvXkgkEisulysbIBwOnzx37tyEUBi45i6qqqpa1TTNGwqF8vPz8wE4PDxEKcUfdzKXNjbuAKUMcHBwQENDQychZZ5aVm3//v3FUCjUF41GbxcUFEg6nVZHR0e/7adWfo7FL4ExBsjEvjg6cuVp4H9T/ZwqAWC44QAAAABJRU5ErkJggg==';
        }
        return toDataURL.apply(this, arguments);
      };
      
      CanvasRenderingContext2D.prototype.getImageData = function() {
        const imageData = getImageData.apply(this, arguments);
        if (this.canvas.width === 16 && this.canvas.height === 16) {
          // Небольшие вариации в данных
          for (let i = 0; i < imageData.data.length; i += 100) {
            imageData.data[i] = imageData.data[i] ^ Math.floor(Math.random() * 2); 
          }
        }
        return imageData;
      };
      
      // Эмуляция Chrome
      if (typeof window.chrome === 'undefined') {
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
      }
      
      // Расширения экрана
      Object.defineProperty(screen, 'width', { get: () => window.innerWidth });
      Object.defineProperty(screen, 'height', { get: () => window.innerHeight });
      Object.defineProperty(screen, 'availWidth', { get: () => window.innerWidth });
      Object.defineProperty(screen, 'availHeight', { get: () => window.innerHeight - 40 });
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
      
      // Перехват проверок на автоматизацию
      const originalKeys = Object.keys;
      Object.keys = function(obj) {
        if (obj === navigator && originalKeys(obj).includes('webdriver')) {
          return originalKeys(obj).filter(key => key !== 'webdriver');
        }
        return originalKeys(obj);
      };
    });
    
    log('✅ Advanced anti-detection script applied');
    
    // 6. Устанавливаем cookie для обхода баннера
    log('Setting privacy cookies...');
    await context.addCookies([
      {
        name: 'OptanonAlertBoxClosed',
        value: new Date().toISOString(),
        domain: '.otodom.pl',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 7
      },
      {
        name: 'OptanonConsent',
        value: 'isIABGlobal=false&datestamp=Mon+Apr+29+2024+08%3A05%3A54+GMT%2B0000&version=202209.1.0&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0&geolocation=PL%3B14&AwaitingReconsent=false',
        domain: '.otodom.pl',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 7
      },
      // Дополнительные cookie для снижения подозрительности
      {
        name: 'device_view',
        value: 'desktop',
        domain: '.otodom.pl',
        path: '/'
      },
      {
        name: 'lang',
        value: 'pl',
        domain: '.otodom.pl',
        path: '/'
      }
    ]);
    log('✅ Privacy cookies set');
    
    // 7. Навигационная последовательность через польский интерфейс
    log('Starting navigation sequence with human-like behavior...');
    
    // Переход на главную страницу
    log('Step 1: Loading main page...');
    await page.goto('https://www.otodom.pl/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Проверяем загрузку страницы
    log(`Current URL: ${page.url()}`);
    log(`Page title: ${await page.title()}`);
    
    // Делаем скриншот главной страницы
    const mainScreenshotPath = path.join(LOG_DIR, `${TASK_ID}_main.png`);
    await page.screenshot({ path: mainScreenshotPath });
    log(`✅ Main page screenshot saved: ${mainScreenshotPath}`);
    
    // Имитируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // 8. Переходим через категории (реалистичный пользовательский путь)
    log('Step 2: Navigating to sales section...');
    
    // Обновляем header для внутреннего перехода
    await page.setExtraHTTPHeaders({
      'sec-fetch-site': 'same-origin',
      'Referer': 'https://www.otodom.pl/'
    });
    
    // Клик на категорию "Sprzedaż"
    try {
      // Сначала пытаемся через клик по элементу (как человек)
      const salesLink = await page.waitForSelector('a[href*="/pl/oferty/sprzedaz"]', { timeout: 5000 });
      if (salesLink) {
        // Небольшая задержка перед кликом
        await page.waitForTimeout(500 + Math.random() * 500);
        await salesLink.click();
      } else {
        // Если клик не удался, переходим напрямую
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', { 
          waitUntil: 'domcontentloaded',
          timeout: 10000,
          referer: 'https://www.otodom.pl/'
        });
      }
    } catch (e) {
      log(`Couldn't click sales link: ${e.message}. Using direct navigation.`);
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000,
        referer: 'https://www.otodom.pl/'
      });
    }
    
    // Проверка загрузки и задержка
    await page.waitForTimeout(1000 + Math.random() * 1000);
    log(`Current URL after sales click: ${page.url()}`);
    
    // Скриншот страницы категории
    const salesScreenshotPath = path.join(LOG_DIR, `${TASK_ID}_sales.png`);
    await page.screenshot({ path: salesScreenshotPath });
    log(`✅ Sales page screenshot saved: ${salesScreenshotPath}`);
    
    // Имитируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // 9. Переходим к категории "Mieszkanie"
    log('Step 3: Navigating to apartments category...');
    
    // Обновляем header для внутреннего перехода
    await page.setExtraHTTPHeaders({
      'Referer': page.url()
    });
    
    // Клик на категорию "Mieszkanie"
    try {
      const apartmentLink = await page.waitForSelector('a[href*="/pl/oferty/sprzedaz/mieszkanie"]', { timeout: 5000 });
      if (apartmentLink) {
        await page.waitForTimeout(800 + Math.random() * 400);
        await apartmentLink.click();
      } else {
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', { 
          waitUntil: 'domcontentloaded',
          timeout: 10000,
          referer: page.url()
        });
      }
    } catch (e) {
      log(`Couldn't click apartment link: ${e.message}. Using direct navigation.`);
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000,
        referer: page.url()
      });
    }
    
    // Проверка загрузки и задержка
    await page.waitForTimeout(1500 + Math.random() * 500);
    log(`Current URL after apartment click: ${page.url()}`);
    
    // Скриншот страницы квартир
    const apartmentsScreenshotPath = path.join(LOG_DIR, `${TASK_ID}_apartments.png`);
    await page.screenshot({ path: apartmentsScreenshotPath });
    log(`✅ Apartments page screenshot saved: ${apartmentsScreenshotPath}`);
    
    // Имитируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // 10. Переходим к Варшаве
    log('Step 4: Navigating to Warsaw location...');
    
    // Обновляем header для внутреннего перехода
    await page.setExtraHTTPHeaders({
      'Referer': page.url()
    });
    
    try {
      // Попытка клика по полю поиска локации
      const locationField = await page.waitForSelector('input[placeholder*="lokalizacja"], input[data-cy="location-search-input"]', { timeout: 5000 });
      if (locationField) {
        await locationField.click();
        await page.waitForTimeout(500 + Math.random() * 300);
        await locationField.fill('Warszawa');
        await page.waitForTimeout(800 + Math.random() * 400);
        
        // Ищем элемент Warszawa в результатах
        try {
          const warsawOption = await page.waitForSelector('div[role="option"]:has-text("Warszawa"), li:has-text("Warszawa")', { timeout: 3000 });
          if (warsawOption) {
            await warsawOption.click();
            await page.waitForTimeout(1000 + Math.random() * 500);
          }
        } catch (e) {
          log(`Couldn't click Warsaw option: ${e.message}. Trying to press Enter.`);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000 + Math.random() * 500);
        }
      } else {
        // Прямой переход, если не нашли поле поиска
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa', { 
          waitUntil: 'domcontentloaded',
          timeout: 10000,
          referer: page.url()
        });
      }
    } catch (e) {
      log(`Couldn't interact with location field: ${e.message}. Using direct navigation.`);
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000,
        referer: page.url()
      });
    }
    
    // Проверка загрузки и задержка
    await page.waitForTimeout(1500 + Math.random() * 1000);
    log(`Current URL after Warsaw selection: ${page.url()}`);
    
    // Скриншот страницы Варшавы
    const warsawScreenshotPath = path.join(LOG_DIR, `${TASK_ID}_warsaw.png`);
    await page.screenshot({ path: warsawScreenshotPath });
    log(`✅ Warsaw page screenshot saved: ${warsawScreenshotPath}`);
    
    // Имитируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // 11. Переходим к району Śródmieście
    log('Step 5: Navigating to district...');
    
    // Обновляем header для внутреннего перехода
    await page.setExtraHTTPHeaders({
      'Referer': page.url()
    });
    
    try {
      // Пытаемся найти и нажать на выбор района
      const districtField = await page.waitForSelector('[data-cy="location-district-filter"], .css-19bb58m', { timeout: 5000 });
      if (districtField) {
        await districtField.click();
        await page.waitForTimeout(800 + Math.random() * 400);
        
        // Ищем чекбокс для Śródmieście
        try {
          const districtCheckbox = await page.waitForSelector(
            `label:has-text("${DISTRICT}"), input[name="${DISTRICT}"], [data-value="${DISTRICT}"]`, 
            { timeout: 3000 }
          );
          if (districtCheckbox) {
            await districtCheckbox.click();
            await page.waitForTimeout(1000 + Math.random() * 500);
            
            // Нажимаем кнопку применить
            try {
              const applyButton = await page.waitForSelector('[data-cy="search.filters.submit-btn"], button:has-text("Potwierdź")', { timeout: 3000 });
              if (applyButton) {
                await applyButton.click();
                await page.waitForTimeout(1000 + Math.random() * 500);
              }
            } catch (e) {
              log(`Couldn't click apply button: ${e.message}`);
            }
          } else {
            // Прямой переход, если не нашли чекбокс
            await page.goto(`https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${DISTRICT}`, { 
              waitUntil: 'domcontentloaded',
              timeout: 10000,
              referer: page.url()
            });
          }
        } catch (e) {
          log(`Couldn't find district checkbox: ${e.message}. Using direct navigation.`);
          await page.goto(`https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${DISTRICT}`, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000,
            referer: page.url()
          });
        }
      } else {
        // Прямой переход, если не нашли поле выбора района
        await page.goto(`https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${DISTRICT}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000,
          referer: page.url()
        });
      }
    } catch (e) {
      log(`Couldn't interact with district field: ${e.message}. Using direct navigation.`);
      await page.goto(`https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${DISTRICT}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000,
        referer: page.url()
      });
    }
    
    // Проверка загрузки и задержка
    await page.waitForTimeout(1500 + Math.random() * 1000);
    log(`Current URL after district selection: ${page.url()}`);
    
    // Скриншот страницы района
    const districtScreenshotPath = path.join(LOG_DIR, `${TASK_ID}_district.png`);
    await page.screenshot({ path: districtScreenshotPath });
    log(`✅ District page screenshot saved: ${districtScreenshotPath}`);
    
    // Имитируем человеческое поведение
    await simulateHumanBehavior(page);
    
    // 12. Финальный шаг - выбор комнат
    log('Step 6: Selecting room type...');
    
    // Обновляем header для внутреннего перехода
    await page.setExtraHTTPHeaders({
      'Referer': page.url()
    });
    
    // Формируем финальный URL для запроса
    const targetUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/${DISTRICT}?roomsNumber=%5B${ROOM_TYPE}%5D`;
    
    try {
      // Пытаемся найти и нажать на фильтр комнат
      const roomsFilter = await page.waitForSelector('[data-cy="roomsNumber-filter"], button:has-text("Liczba pokoi")', { timeout: 5000 });
      if (roomsFilter) {
        await roomsFilter.click();
        await page.waitForTimeout(800 + Math.random() * 400);
        
        // Выбираем количество комнат
        let roomLabel = '';
        switch (ROOM_TYPE) {
          case 'ONE': roomLabel = '1 pokój'; break;
          case 'TWO': roomLabel = '2 pokoje'; break;
          case 'THREE': roomLabel = '3 pokoje'; break;
          case 'FOUR': roomLabel = '4 i więcej'; break;
        }
        
        // Ищем чекбокс для выбранного количества комнат
        try {
          const roomCheckbox = await page.waitForSelector(
            `label:has-text("${roomLabel}"), [data-cy="checkbox-filter-${ROOM_TYPE}"]`, 
            { timeout: 3000 }
          );
          if (roomCheckbox) {
            await roomCheckbox.click();
            await page.waitForTimeout(1000 + Math.random() * 500);
            
            // Нажимаем кнопку применить
            try {
              const applyButton = await page.waitForSelector('[data-cy="search.filters.submit-btn"], button:has-text("Potwierdź")', { timeout: 3000 });
              if (applyButton) {
                await applyButton.click();
                await page.waitForTimeout(1500 + Math.random() * 500);
              }
            } catch (e) {
              log(`Couldn't click apply button: ${e.message}`);
            }
          } else {
            // Прямой переход, если не нашли чекбокс
            await page.goto(targetUrl, { 
              waitUntil: 'domcontentloaded',
              timeout: 15000,
              referer: page.url()
            });
          }
        } catch (e) {
          log(`Couldn't find room checkbox: ${e.message}. Using direct navigation.`);
          await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 15000,
            referer: page.url()
          });
        }
      } else {
        // Прямой переход, если не нашли фильтр комнат
        await page.goto(targetUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000,
          referer: page.url()
        });
      }
    } catch (e) {
      log(`Couldn't interact with rooms filter: ${e.message}. Using direct navigation.`);
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000,
        referer: page.url()
      });
    }
    
    // Дополнительное ожидание для полной загрузки результатов
    await page.waitForTimeout(2000 + Math.random() * 1000);
    log(`Final URL with room filter: ${page.url()}`);
    
    // 13. Сохраняем страницу результатов
    const resultsScreenshotPath = path.join(LOG_DIR, `${TASK_ID}_results.png`);
    await page.screenshot({ path: resultsScreenshotPath, fullPage: false });
    log(`✅ Results page screenshot saved: ${resultsScreenshotPath}`);
    
    // Сохраняем HTML страницы для анализа
    const htmlPath = path.join(LOG_DIR, `${TASK_ID}_results.html`);
    const pageContent = await page.content();
    fs.writeFileSync(htmlPath, pageContent);
    log(`✅ Results page HTML saved: ${htmlPath}`);
    
    // 14. Проверяем на блокировку
    const isBlocked = pageContent.includes('ERROR: The request could not be satisfied') ||
                      pageContent.includes('Request blocked') ||
                      pageContent.includes('Generated by cloudfront') ||
                      pageContent.includes('Access Denied');
    
    if (isBlocked) {
      log('❌ BLOCKED: CloudFront protection detected!');
      fs.writeFileSync(path.join(LOG_DIR, `${TASK_ID}_blocked.txt`), 'CloudFront Block Detected');
    } else {
      log('✅ SUCCESS: No CloudFront blocking detected!');
    }
    
    // 15. Извлекаем данные о ценах и площади
    if (!isBlocked) {
      log('Extracting property data...');
      
      const data = await page.evaluate(() => {
        // Функция для чистки чисел от нечисловых символов
        const cleanPrice = (str) => {
          return parseInt(str.replace(/[^\d]/g, '')) || 0;
        };
        
        // Функция для чистки площади (с учетом запятой)
        const cleanArea = (str) => {
          return parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        };
        
        // Селекторы для поиска цен
        const priceSelectors = [
          '[data-cy="listing-item-price"]',
          '.css-s8lxhp',
          '.e1jyrtvq0',
          'article .css-1mojcj4 span',
          'article span[data-testid]',
          'article span[aria-label*="price"]',
          'article .css-1956j2x'
        ];
        
        // Селекторы для поиска площади
        const areaSelectors = [
          '[data-cy="listing-item-area"]',
          'article span[aria-label*="area"]',
          'article span[aria-label*="powierzchnia"]',
          'article .css-1dyvuwm',
          'article .css-1qu6vow span'
        ];
        
        // Массивы для хранения найденных данных
        let prices = [];
        let areas = [];
        
        // Счетчик объявлений
        const articleCount = document.querySelectorAll('article').length;
        
        // Текст счетчика результатов
        const countElement = document.querySelector('[data-cy="search.listing-panel.label"]');
        const countText = countElement ? countElement.textContent.trim() : null;
        
        // Ищем цены с помощью всех селекторов
        for (const selector of priceSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            const foundPrices = Array.from(elements)
              .map(el => cleanPrice(el.textContent))
              .filter(price => price > 0);
            
            if (foundPrices.length > prices.length) {
              prices = foundPrices;
            }
          }
        }
        
        // Ищем площади с помощью всех селекторов
        for (const selector of areaSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            const foundAreas = Array.from(elements)
              .map(el => cleanArea(el.textContent))
              .filter(area => area > 0);
            
            if (foundAreas.length > areas.length) {
              areas = foundAreas;
            }
          }
        }
        
        // Расчет цен за квадратный метр
        const pricesPerSqm = [];
        
        // Если найдено одинаковое количество цен и площадей
        if (prices.length === areas.length && prices.length > 0) {
          for (let i = 0; i < prices.length; i++) {
            if (areas[i] > 0) {
              pricesPerSqm.push(Math.round(prices[i] / areas[i]));
            }
          }
        }
        
        // Расчет средних значений
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
          articleCount,
          countText,
          prices,
          areas,
          pricesPerSqm,
          avgPrice,
          avgArea,
          avgPricePerSqm,
          pageTitle: document.title,
          url: window.location.href
        };
      });
      
      log(`Data extracted: Found ${data.prices.length} prices, ${data.areas.length} areas`);
      log(`Average price: ${data.avgPrice} PLN, Average area: ${data.avgArea} m²`);
      log(`Average price per m²: ${data.avgPricePerSqm} PLN/m²`);
      
      // Сохраняем результаты в JSON
      const resultsPath = path.join(LOG_DIR, `${TASK_ID}_data.json`);
      fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        url: data.url,
        district: DISTRICT,
        roomType: ROOM_TYPE,
        isBlocked,
        articleCount: data.articleCount,
        countText: data.countText,
        prices: data.prices,
        areas: data.areas,
        pricesPerSqm: data.pricesPerSqm,
        avgPrice: data.avgPrice,
        avgArea: data.avgArea,
        avgPricePerSqm: data.avgPricePerSqm,
        pageTitle: data.pageTitle
      }, null, 2));
      
      log(`✅ Results data saved to: ${resultsPath}`);
    }
    
    // 16. Финальный отчет
    log('\n=== SCRAPING COMPLETE ===');
    log(`District: ${DISTRICT}`);
    log(`Room type: ${ROOM_TYPE}`);
    log(`Blocked: ${isBlocked}`);
    if (!isBlocked) {
      log('Status: SUCCESS! Data collected successfully');
    } else {
      log('Status: PARTIAL SUCCESS - Site loaded but possibly blocked or limited');
    }
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    
    // Если страница доступна, делаем скриншот ошибки
    if (page) {
      try {
        const errorScreenshotPath = path.join(LOG_DIR, `${TASK_ID}_error.png`);
        await page.screenshot({ path: errorScreenshotPath });
        log(`Error screenshot saved: ${errorScreenshotPath}`);
      } catch (e) {
        log(`Failed to save error screenshot: ${e.message}`);
      }
    }
    
    // Сохраняем стек ошибки
    fs.writeFileSync(
      path.join(LOG_DIR, `${TASK_ID}_error.txt`), 
      `${error.message}\n\n${error.stack || 'No stack trace available'}`
    );
  } finally {
    // Очистка ресурсов
    clearTimeout(timeoutId);
    
    if (page) {
      try {
        await page.close();
        log('Page closed');
      } catch (e) {
        log(`Error closing page: ${e.message}`);
      }
    }
    
    if (context) {
      try {
        await context.close();
        log('Context closed');
      } catch (e) {
        log(`Error closing context: ${e.message}`);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
        log('Browser closed');
      } catch (e) {
        log(`Error closing browser: ${e.message}`);
      }
    }
    
    log('All resources cleaned up');
    log('=== SCRAPER FINISHED ===');
  }
}

/**
 * Симулирует поведение реального пользователя с реалистичными действиями
 */
async function simulateHumanBehavior(page: Page): Promise<void> {
  try {
    log('Simulating human behavior...');
    
    // Случайное количество действий от 2 до 4
    const actionsCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < actionsCount; i++) {
      // Случайное действие
      const actionType = Math.floor(Math.random() * 5);
      
      switch (actionType) {
        case 0:
          // Плавное движение мыши к случайной точке с зависанием
          const x1 = 100 + Math.floor(Math.random() * 800);
          const y1 = 100 + Math.floor(Math.random() * 400);
          await page.mouse.move(x1, y1, { steps: 5 });
          await page.waitForTimeout(100 + Math.random() * 200);
          break;
          
        case 1:
          // Скролл вниз случайной длины
          const scrollDownDistance = 100 + Math.floor(Math.random() * 400);
          await page.evaluate((distance) => {
            window.scrollBy({ top: distance, behavior: 'smooth' });
          }, scrollDownDistance);
          break;
          
        case 2:
          // Скролл вверх, если не в начале страницы
          const scrollUpDistance = 50 + Math.floor(Math.random() * 200);
          await page.evaluate((distance) => {
            const currentScroll = window.scrollY;
            if (currentScroll > distance) {
              window.scrollBy({ top: -distance, behavior: 'smooth' });
            }
          }, scrollUpDistance);
          break;
          
        case 3:
          // Наведение на случайный элемент (ссылку, кнопку)
          try {
            const elements = await page.$$('a, button, span[role="button"]');
            if (elements.length > 0) {
              const randomElement = elements[Math.floor(Math.random() * elements.length)];
              await randomElement.hover();
              await page.waitForTimeout(300 + Math.random() * 400);
            }
          } catch (e) {
            // Игнорируем ошибки при наведении
          }
          break;
          
        case 4:
          // Сложное движение мыши с несколькими точками
          const startX = 100 + Math.floor(Math.random() * 400);
          const startY = 100 + Math.floor(Math.random() * 200);
          
          await page.mouse.move(startX, startY, { steps: 5 });
          await page.waitForTimeout(50 + Math.random() * 100);
          
          const midX = startX + (50 - Math.floor(Math.random() * 100));
          const midY = startY + (50 - Math.floor(Math.random() * 100));
          
          await page.mouse.move(midX, midY, { steps: 3 });
          await page.waitForTimeout(30 + Math.random() * 70);
          
          const endX = midX + (50 - Math.floor(Math.random() * 100));
          const endY = midY + (50 - Math.floor(Math.random() * 100));
          
          await page.mouse.move(endX, endY, { steps: 4 });
          break;
      }
      
      // Пауза между действиями
      const pauseDuration = 300 + Math.floor(Math.random() * 700);
      await page.waitForTimeout(pauseDuration);
    }
    
    log(`✓ Simulated ${actionsCount} human-like actions`);
  } catch (error) {
    log(`Error in human behavior simulation: ${error.message}`);
  }
}

// Запускаем скрапер
enhancedStealthScraper()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });