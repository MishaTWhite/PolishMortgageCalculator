/**
 * Основной модуль скрапинга с использованием Playwright
 */
import { chromium, firefox, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
  BROWSER_LAUNCH_OPTIONS,
  DELAYS,
  RETRY,
  ANTIBOT,
  RESOURCE_LIMITS,
  ROOM_TYPE_QUERIES,
  getRandomUserAgent,
  getRandomPolishLocation,
  getRandomDelay
} from './scraperConfig';
import {
  logInfo,
  logError,
  logWarning,
  logDebug,
  getCurrentMemoryUsage,
  logMemoryUsage
} from './scraperLogger';
import { ScrapeTask, registerTaskProcessor } from './scrapeTaskManager';

// Директория для промежуточных результатов
const RESULTS_DIR = path.join(process.cwd(), 'scraper_results');

// Создаем директорию, если не существует
if (!fs.existsSync(RESULTS_DIR)) {
  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  } catch (err) {
    console.error(`Failed to create results directory: ${err}`);
  }
}

// Глобальные переменные для управления ресурсами
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let browserStartTime: number = 0;
let pagesProcessed: number = 0;

/**
 * Инициализирует браузер с проверкой ресурсов
 */
async function initBrowser(): Promise<Browser> {
  // Проверяем текущее использование памяти
  const memoryMb = getCurrentMemoryUsage();
  logInfo(`Current memory usage before browser init: ${memoryMb} MB`);
  
  if (browser) {
    logInfo('Browser instance already exists, closing it first');
    await closeBrowser();
  }
  
  logInfo('Initializing browser with enhanced options for Replit environment');
  
  // Путь к системному Chromium в Replit
  const SYSTEM_CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  
  logInfo('Initializing browser strategy optimized for Replit GLIBC 2.31');
  
  try {
    // Пробуем сначала системный Chromium, оптимизированный для окружения Replit
    logInfo(`Trying to launch system Chromium from: ${SYSTEM_CHROMIUM_PATH}`);
    
    const chromiumOptions = {
      headless: true,
      executablePath: SYSTEM_CHROMIUM_PATH,
      args: [
        // Отключение песочницы
        '--no-sandbox',
        '--disable-setuid-sandbox',
        
        // Минимизация графических компонентов для совместимости с GLIBC 2.31
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-webgl',
        '--disable-accelerated-2d-canvas',
        
        // Оптимизация памяти и процессов
        '--single-process',
        '--no-zygote',
        '--disable-dev-shm-usage',
        
        // Отключение необязательной функциональности
        '--disable-extensions',
        '--disable-sync',
        '--disable-default-apps',
        '--mute-audio',
        
        // Минимальное окно
        '--window-size=800,600'
      ],
      chromiumSandbox: false,
      timeout: 120000,
      handleSIGINT: false,
      ignoreHTTPSErrors: true
    };
    
    logInfo(`Chromium options: ${JSON.stringify(chromiumOptions, null, 2)}`);
    browser = await chromium.launch(chromiumOptions);
    browserStartTime = Date.now();
    pagesProcessed = 0;
    logInfo('System Chromium browser successfully launched');
    return browser;
  } catch (chromiumError) {
    logError(`System Chromium launch failed: ${chromiumError}`);
    
    // Если системный Chromium не запустился, пробуем Firefox как запасной вариант
    logInfo('Trying to launch Firefox browser as fallback');
    try {
      const firefoxOptions = {
        headless: true,
        args: ['--no-sandbox'],
        timeout: 60000,
        handleSIGINT: false,
        downloadsPath: '/tmp/playwright-downloads',
        executablePath: '/tmp/firefox-extracted/firefox/firefox-bin'
      };
    
      logInfo(`Firefox options: ${JSON.stringify(firefoxOptions)}`);
      browser = await firefox.launch(firefoxOptions);
      browserStartTime = Date.now();
      pagesProcessed = 0;
      logInfo('Firefox browser successfully launched');
      return browser;
    } catch (error) {
      logError(`Firefox launch failed: ${error}`);
      
      // Если Firefox не запустился, пробуем системный Chromium
      try {
        // Путь к системному Chromium в Replit
        const SYSTEM_CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
        
        logInfo(`Trying to launch system Chromium from: ${SYSTEM_CHROMIUM_PATH}`);
        
        const minimalOptions = {
          headless: true,
          executablePath: SYSTEM_CHROMIUM_PATH,
          args: [
            // Отключение песочницы
            '--no-sandbox',
            '--disable-setuid-sandbox',
            
            // Минимизация графических компонентов для совместимости с GLIBC 2.31
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-webgl',
            '--disable-accelerated-2d-canvas',
            
            // Оптимизация памяти и процессов
            '--single-process',
            '--no-zygote',
            '--disable-dev-shm-usage',
            
            // Отключение необязательной функциональности
            '--disable-extensions',
            '--disable-sync',
            '--disable-default-apps',
            '--mute-audio',
            
            // Минимальное окно
            '--window-size=800,600'
          ],
          chromiumSandbox: false,
          timeout: 120000,
          handleSIGINT: false,
          ignoreHTTPSErrors: true
        };
        
        logInfo(`Chromium fallback options: ${JSON.stringify(minimalOptions)}`);
        browser = await chromium.launch(minimalOptions);
        browserStartTime = Date.now();
        pagesProcessed = 0;
        logInfo('Chromium browser launched as fallback');
        return browser;
      } catch (fallbackError) {
        logError(`All browser launch attempts failed: ${fallbackError}`);
        throw new Error(`Failed to launch any browser: ${error}, then: ${fallbackError}`);
      }
    }
  }
}

/**
 * Создает контекст браузера с настройками против обнаружения
 */
async function createContext(browser: Browser): Promise<BrowserContext> {
  // Получаем случайный User-Agent и локацию
  const userAgent = getRandomUserAgent();
  const location = getRandomPolishLocation();
  
  logInfo('Creating browser context', {
    userAgent: userAgent.substring(0, 30) + '...',
    location
  });
  
  // Создаем контекст с настройками
  context = await browser.newContext({
    userAgent,
    viewport: { width: 1366, height: 768 },
    locale: 'pl-PL',
    geolocation: location,
    permissions: ['geolocation'],
    colorScheme: 'light',
    deviceScaleFactor: 1,
    bypassCSP: true,
    javaScriptEnabled: true,
    hasTouch: false,
    ignoreHTTPSErrors: true
  });
  
  return context;
}

/**
 * Закрывает браузер и очищает ресурсы
 */
async function closeBrowser(): Promise<void> {
  try {
    if (context) {
      logInfo('Closing browser context');
      await context.close().catch(e => logError(`Error closing context: ${e}`));
      context = null;
    }
    
    if (browser) {
      logInfo('Closing browser');
      await browser.close().catch(e => logError(`Error closing browser: ${e}`));
      browser = null;
    }
    
    // Принудительная сборка мусора
    if (global.gc) {
      global.gc();
    }
  } catch (err) {
    logError(`Error closing browser: ${err}`);
  }
}

/**
 * Проверяет необходимость перезапуска браузера
 * на основе использования памяти и других метрик
 */
async function checkBrowserHealth(): Promise<boolean> {
  // Проверяем текущую память
  const memoryMb = getCurrentMemoryUsage();
  
  // Если превышен критический порог памяти
  if (memoryMb > RESOURCE_LIMITS.MEMORY.CRITICAL_THRESHOLD) {
    logWarning(`Memory usage critical: ${memoryMb} MB. Restarting browser.`);
    await closeBrowser();
    return false;
  }
  
  // Если превышен порог предупреждения
  if (memoryMb > RESOURCE_LIMITS.MEMORY.WARNING_THRESHOLD) {
    logWarning(`High memory usage: ${memoryMb} MB`);
  }
  
  // Проверяем количество обработанных страниц
  if (pagesProcessed >= RESOURCE_LIMITS.BROWSER_SESSION.MAX_PAGES_PER_SESSION) {
    logInfo(`Processed ${pagesProcessed} pages. Restarting browser for fresh session.`);
    await closeBrowser();
    return false;
  }
  
  // Проверяем время работы браузера
  const sessionDuration = Date.now() - browserStartTime;
  if (sessionDuration > RESOURCE_LIMITS.BROWSER_SESSION.MAX_SESSION_DURATION) {
    logInfo(`Browser session duration: ${Math.round(sessionDuration/1000)}s. Restarting browser.`);
    await closeBrowser();
    return false;
  }
  
  return true;
}

/**
 * Настраивает страницу для скрапинга, блокируя ненужные ресурсы
 */
async function setupPage(page: Page): Promise<void> {
  // Блокируем загрузку лишних ресурсов для экономии памяти
  await page.route('**/*', async route => {
    const request = route.request();
    const resourceType = request.resourceType();
    
    // Блокируем изображения, шрифты, стили, медиа
    if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  
  // Устанавливаем таймауты
  page.setDefaultTimeout(DELAYS.NAVIGATION.PAGE_LOAD_TIMEOUT);
  page.setDefaultNavigationTimeout(DELAYS.NAVIGATION.PAGE_LOAD_TIMEOUT);
  
  logDebug('Page set up with resource blocking and timeouts');
}

/**
 * Проверяет наличие антибот-защиты на странице
 */
async function checkForBotDetection(page: Page): Promise<boolean> {
  try {
    // Получаем заголовок и содержимое страницы
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const bodyLength = await page.evaluate(() => document.body.innerHTML.length);
    
    logDebug(`Page title: "${title}", content length: ${bodyLength}`);
    
    // Проверяем наличие ключевых слов антибот-защиты
    for (const phrase of ANTIBOT.DETECTION_PHRASES) {
      if (bodyText.toLowerCase().includes(phrase) || title.toLowerCase().includes(phrase)) {
        logWarning(`Bot detection triggered: Found phrase "${phrase}" on page`);
        return true;
      }
    }
    
    // Проверяем, не слишком ли короткая страница (возможно, ошибка)
    if (bodyLength < 5000) {
      logWarning(`Suspiciously small page: ${bodyLength} bytes. Possible bot detection.`);
      return true;
    }
    
    // Проверяем наличие ключевых элементов Otodom
    const hasMainContent = await page.$('main, div[data-cy="search-listing"]');
    
    if (!hasMainContent) {
      logWarning('Main content element not found. Possible bot detection or wrong page loaded.');
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`Error in bot detection check: ${error}`);
    return true; // При ошибке считаем, что сработала защита
  }
}

/**
 * Выполняет случайную прокрутку страницы (имитация человека)
 */
async function performRandomScrolling(page: Page): Promise<void> {
  if (!ANTIBOT.USER_BEHAVIOR.RANDOM_SCROLLING) return;
  
  logDebug('Performing random scrolling');
  
  try {
    // Определяем высоту страницы
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const windowHeight = await page.evaluate(() => window.innerHeight);
    
    // Количество шагов прокрутки
    const scrollSteps = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < scrollSteps; i++) {
      // Случайное расстояние прокрутки (от 100px до 30% высоты окна)
      const scrollDistance = Math.max(100, Math.floor(windowHeight * (0.1 + Math.random() * 0.2)));
      
      // В основном скроллим вниз, иногда вверх
      const direction = Math.random() > 0.2 ? 1 : -1;
      
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance * direction);
      
      // Пауза между прокрутками
      const delay = getRandomDelay(300, 800);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } catch (error) {
    logError(`Error during random scrolling: ${error}`);
  }
}

/**
 * Имитирует поведение пользователя, посещающего случайное объявление
 */
async function visitRandomListing(page: Page): Promise<boolean> {
  if (Math.random() > ANTIBOT.USER_BEHAVIOR.VISIT_RANDOM_LISTINGS) return false;
  
  logInfo('Attempting to visit a random listing');
  
  try {
    // Находим все объявления на странице
    const listings = await page.$$('article a, [data-cy="listing-item"] a, [data-cy="search.listing"] a');
    
    if (listings.length === 0) {
      logDebug('No listing links found');
      return false;
    }
    
    // Выбираем случайное объявление
    const randomIndex = Math.floor(Math.random() * listings.length);
    const randomListing = listings[randomIndex];
    
    // Запоминаем текущий URL
    const currentUrl = page.url();
    
    // Кликаем на объявление
    logInfo(`Clicking on random listing (${randomIndex + 1}/${listings.length})`);
    await randomListing.click();
    
    // Ждем загрузки страницы объявления
    await page.waitForLoadState('networkidle', { timeout: 10000 })
      .catch(e => logWarning(`Timeout waiting for listing page: ${e}`));
    
    // Проверяем, изменился ли URL
    const newUrl = page.url();
    if (newUrl === currentUrl) {
      logWarning('URL did not change after clicking listing');
      return false;
    }
    
    // Имитируем просмотр деталей объявления
    await performRandomScrolling(page);
    
    // Задержка в стиле "чтение деталей"
    const viewingTime = getRandomDelay(3000, 8000);
    logInfo(`Viewing listing for ${viewingTime}ms`);
    await new Promise(resolve => setTimeout(resolve, viewingTime));
    
    // Возвращаемся на страницу результатов
    logInfo('Going back to search results');
    await page.goBack({ waitUntil: 'networkidle' });
    
    // Проверяем, что вернулись на исходную страницу
    const backUrl = page.url();
    const backToResults = backUrl === currentUrl;
    
    if (!backToResults) {
      logWarning(`Did not return to original URL: ${currentUrl} vs ${backUrl}`);
    }
    
    return backToResults;
  } catch (error) {
    logError(`Error visiting random listing: ${error}`);
    
    // Пробуем вернуться назад на всякий случай
    try {
      await page.goBack({ waitUntil: 'networkidle' });
    } catch (e) {
      logError(`Failed to go back after error: ${e}`);
    }
    
    return false;
  }
}

/**
 * Обрабатывает cookie-баннер на странице
 */
async function handleCookieBanner(page: Page): Promise<boolean> {
  logInfo('Checking for cookie banner...');
  
  // Для расширенной диагностики
  let cookieAttempted = false;
  let cookieAccepted = false;
  let cookieError = "";
  let diagnosticInfo: Record<string, any> = {};
  
  try {
    // Делаем скриншот до обработки cookie-баннера
    try {
      const screenshotPath = `./logs/cookie_banner_before.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      logInfo(`Saved pre-cookie screenshot to ${screenshotPath}`);
    } catch (screenshotError) {
      logWarning(`Failed to save pre-cookie screenshot: ${screenshotError}`);
    }

    // Массив возможных селекторов для кнопки принятия cookies
    const acceptButtonSelectors = [
      '[data-testid="button-accept"]',
      'button[data-cy="accept-cookies"]',
      'button[data-testid="accept-consent"]',
      'button[id="onetrust-accept-btn-handler"]',
      '#onetrust-accept-btn-handler',
      'button:has-text("Akceptuję")',
      'button:has-text("Akceptuj")',
      'button:has-text("Zgadzam się")',
      'button:has-text("Accept all")',
      'button:has-text("Accept cookies")',
      '.css-1784inr',   // Специфичный селектор с Otodom
      '[data-testid="accept-gdpr-button"]',
      'button.cookie-close'
    ];

    // СТРАТЕГИЯ 1: JavaScript evaluate для клика на кнопку
    logInfo('Trying cookie accept via JavaScript evaluate...');
    try {
      cookieAttempted = true;
      const jsResult = await page.evaluate(() => {
        const selectors = [
          'button[id="onetrust-accept-btn-handler"]',
          '#onetrust-accept-btn-handler',
          'button.cookie-consent__button',
          '[data-testid="accept-gdpr-button"]',
          '[data-testid="cookie-policy-dialog-accept-button"]',
          '[data-testid="button-accept"]',
          // Пробуем найти любую кнопку с текстом принятия cookies
          ...Array.from(document.querySelectorAll('button')).filter(el => 
            el.textContent && 
            ['accept', 'akceptuj', 'zgadzam'].some(text => 
              el.textContent?.toLowerCase().includes(text) || false
            )
          )
        ];
        
        for (const selector of selectors) {
          const element = typeof selector === 'string' 
            ? document.querySelector(selector) 
            : selector;
          
          if (element) {
            try {
              if ('click' in element) {
                (element as HTMLElement).click();
                return { clicked: true, selector: String(selector) };
              }
            } catch (e) {
              console.error("Click error:", e);
            }
          }
        }
        
        // Глобальный поиск любых кнопок с атрибутами, похожими на cookies
        const allButtons = document.querySelectorAll('button');
        for (const btn of Array.from(allButtons)) {
          if (btn.id?.toLowerCase().includes('cookie') || 
              btn.className?.toLowerCase().includes('cookie') ||
              btn.getAttribute('data-testid')?.toLowerCase().includes('cookie')) {
            try {
              // HTMLButtonElement всегда имеет метод click()
              (btn as HTMLButtonElement).click();
              return { clicked: true, selector: `button#${btn.id || 'unknown'}` };
            } catch (e) {
              console.error("Click error for cookie button:", e);
            }
          }
        }
        
        return { 
          clicked: false, 
          selector: null,
          // Для диагностики
          cookieBannerExists: !!document.querySelector('#onetrust-banner-sdk, #onetrust-consent-sdk, [id*="cookie"], [class*="cookie"]'),
          bodyHtml: document.body.innerHTML.length
        };
      });
      
      diagnosticInfo = { ...diagnosticInfo, jsEvalResult: jsResult };
      
      if (jsResult.clicked) {
        logInfo(`Clicked cookie button via JavaScript: ${jsResult.selector}`);
        cookieAccepted = true;
        
        // Даем время для обработки клика
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        logWarning(`No cookie buttons clicked via JavaScript. Cookie banner exists: ${jsResult.cookieBannerExists}`);
      }
    } catch (error) {
      cookieError = String(error);
      logWarning(`Error handling cookies via JavaScript: ${error}`);
    }
    
    // СТРАТЕГИЯ 2: Стандартный подход с .click() если JS не сработал
    if (!cookieAccepted) {
      let bannerFound = false;
      
      // Проверяем наличие cookie-баннера через несколько селекторов
      for (const selector of acceptButtonSelectors) {
        const button = await page.$(selector);
        if (button) {
          bannerFound = true;
          cookieAttempted = true;
          logInfo(`Cookie banner found with selector: ${selector}`);
          
          try {
            // Кликаем на кнопку принятия
            await button.click();
            logInfo(`Clicked accept button with selector: ${selector}`);
            
            // Ждем исчезновения баннера
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Проверяем, что баннер исчез
            const buttonAfterClick = await page.$(selector);
            if (!buttonAfterClick) {
              logInfo('Cookie banner successfully closed via standard click');
              cookieAccepted = true;
              break;
            } else {
              logWarning('Cookie banner still visible after standard click');
            }
          } catch (clickError) {
            cookieError = String(clickError);
            logWarning(`Error clicking cookie button: ${clickError}`);
          }
        }
      }
      
      if (!bannerFound) {
        logInfo('No cookie banner detected by standard selectors');
      }
    }
    
    // СТРАТЕГИЯ 3: Прямое управление document.cookie и Playwright's cookie API
    if (!cookieAccepted) {
      logInfo('Trying cookie bypass via Playwright cookie API and document.cookie...');
      try {
        cookieAttempted = true;
        
        // Get the current domain from the page
        const currentUrl = page.url();
        const domain = new URL(currentUrl).hostname;
        
        // First set cookies via Playwright's API (more reliable)
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        // Array of cookie definitions for OneTrust and general consent systems
        const cookiesToSet = [
          {
            name: 'OptanonAlertBoxClosed',
            value: now.toISOString(),
            domain: domain,
            path: '/',
            expires: oneYearFromNow.getTime() / 1000,
            secure: true,
            httpOnly: false
          },
          {
            name: 'OptanonConsent',
            value: 'groups=C0001:1,C0002:1,C0003:1,C0004:1',
            domain: domain,
            path: '/',
            expires: oneYearFromNow.getTime() / 1000,
            secure: true,
            httpOnly: false
          },
          {
            name: 'cookieconsent_status',
            value: 'dismiss',
            domain: domain,
            path: '/',
            expires: oneYearFromNow.getTime() / 1000,
            secure: true,
            httpOnly: false
          },
          {
            name: 'cookie_consent',
            value: 'true',
            domain: domain,
            path: '/',
            expires: oneYearFromNow.getTime() / 1000,
            secure: true,
            httpOnly: false
          },
          {
            name: 'gdpr_consent',
            value: 'true',
            domain: domain,
            path: '/',
            expires: oneYearFromNow.getTime() / 1000,
            secure: true,
            httpOnly: false
          }
        ];
        
        // Set all cookies using Playwright's API
        for (const cookie of cookiesToSet) {
          await page.context().addCookies([cookie]);
        }
        
        logInfo(`Set ${cookiesToSet.length} cookies via Playwright API`);
        
        // Also use document.cookie as a fallback
        const cookieResult = await page.evaluate(() => {
          try {
            // Otodom использует OneTrust, устанавливаем соответствующие cookie
            const now = new Date();
            const expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 год
            const expiryStr = expiryDate.toUTCString();
            
            // Enhanced list of cookies based on actual browser inspection
            document.cookie = `OptanonAlertBoxClosed=${now.toISOString()}; expires=${expiryStr}; path=/;`;
            document.cookie = `OptanonConsent=groups=C0001:1,C0002:1,C0003:1,C0004:1; expires=${expiryStr}; path=/;`;
            document.cookie = `OneTrust-SiteName=otodom-pl; expires=${expiryStr}; path=/;`;
            document.cookie = `OptanonChoice=true; expires=${expiryStr}; path=/;`;
            
            // Additional generic cookies
            document.cookie = `cookieconsent_status=dismiss; expires=${expiryStr}; path=/;`;
            document.cookie = `cookie_consent=true; expires=${expiryStr}; path=/;`;
            document.cookie = `gdpr_consent=true; expires=${expiryStr}; path=/;`;
            
            return { cookiesSet: true, cookieLength: document.cookie.length };
          } catch (e) {
            return { cookiesSet: false, error: String(e) };
          }
        });
        
        logInfo(`Document.cookie result: ${JSON.stringify(cookieResult)}`);
        
        // Try a gentle reload with only domcontentloaded to minimize risk of context closure
        logInfo('Reloading page after cookie bypass with safer waitUntil strategy');
        await page.reload({ 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        }).catch(e => {
          logWarning(`Page reload timeout after cookie bypass: ${e}`);
          // Continue even with timeout since page might load partially
        });
        
        // Check visibility after reload using a more robust approach
        let bannerVisibleAfterReload = true;
        try {
          bannerVisibleAfterReload = await page.evaluate(() => {
            // More comprehensive selector check
            const selectors = [
              '#onetrust-banner-sdk', 
              '#onetrust-consent-sdk', 
              '[id*="cookie-banner"]',
              '#gdpr-consent-tool-wrapper',
              '[class*="cookie-consent"]',
              '[class*="cookie-policy"]'
            ];
            
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element) {
                // Check if the element is actually visible
                const style = window.getComputedStyle(element);
                // Use HTMLElement for offsetParent check
                if (style.display !== 'none' && style.visibility !== 'hidden' && (element as HTMLElement).offsetParent !== null) {
                  return true; // Banner is visible
                }
              }
            }
            return false; // No visible banner found
          }).catch(() => true); // Assume banner is visible in case of error
        } catch (evalError) {
          logWarning(`Error evaluating banner visibility: ${evalError}`);
          bannerVisibleAfterReload = true; // Conservative approach
        }
        
        if (!bannerVisibleAfterReload) {
          logInfo('Cookie banner successfully bypassed via cookie API after reload');
          cookieAccepted = true;
        } else {
          logWarning('Cookie banner might still be visible after cookie API bypass');
        }
      } catch (error) {
        cookieError = String(error);
        logWarning(`Error bypassing cookies: ${error}`);
      }
    }
    
    // СТРАТЕГИЯ 4: Если все предыдущие методы не сработали, попробуем обойти через localStorage
    if (!cookieAccepted) {
      logInfo('Trying cookie bypass via localStorage...');
      try {
        cookieAttempted = true;
        
        // Устанавливаем различные ключи localStorage, используемые для cookie-согласия
        await page.evaluate(() => {
          try {
            localStorage.setItem('cookie-consent', 'true');
            localStorage.setItem('cookie_consent', 'true');
            localStorage.setItem('gdpr-consent', 'true');
            localStorage.setItem('gdpr_consent', 'true');
            localStorage.setItem('cookies-accepted', 'true');
            localStorage.setItem('cookieConsent', 'true');
            localStorage.setItem('cookiesAccepted', 'true');
            localStorage.setItem('OptanonAlertBoxClosed', new Date().toISOString());
            localStorage.setItem('OptanonConsent', 'true');
            
            // Специфично для OneTrust (используется на Otodom)
            const oneTrustGroups = "C0001,C0002,C0003,C0004";
            localStorage.setItem('OptanonConsent', `groups=${oneTrustGroups}`);
            
            return { localStorageSet: true };
          } catch (e) {
            return { localStorageSet: false, error: String(e) };
          }
        });
        
        // Использование более безопасной перезагрузки с domcontentloaded вместо networkidle
        logInfo('Reloading page after localStorage cookie consent bypass');
        
        try {
          // Сначала попробуем с минимальным waitUntil для снижения риска таймаута
          await page.reload({ 
            waitUntil: 'domcontentloaded', 
            timeout: 20000 
          });
        } catch (reloadError) {
          logWarning(`Page reload timeout after localStorage bypass: ${reloadError}`);
          // Продолжаем без перезагрузки, так как она не является критической
        }
        
        // Используем более надежную проверку видимости баннера
        let bannerVisible = true;
        try {
          bannerVisible = await page.evaluate(() => {
            // Расширенный набор селекторов для поиска баннеров
            const selectors = [
              '#onetrust-banner-sdk', 
              '#onetrust-consent-sdk', 
              '[id*="cookie-banner"]',
              '#gdpr-consent-tool-wrapper',
              '[class*="cookie-consent"]',
              '[class*="cookie-policy"]'
            ];
            
            // Проверяем не только наличие, но и видимость элементов
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element) {
                // Проверка фактической видимости элемента
                const style = window.getComputedStyle(element);
                if (style.display !== 'none' && style.visibility !== 'hidden' && (element as HTMLElement).offsetParent !== null) {
                  return true; // Баннер видим
                }
              }
            }
            return false; // Видимых баннеров не найдено
          }).catch(() => true); // При ошибке предполагаем, что баннер виден
        } catch (evalError) {
          logWarning(`Error checking banner visibility: ${evalError}`);
          bannerVisible = true; // Консервативный подход
        }
        
        if (!bannerVisible) {
          logInfo('Cookie banner successfully bypassed via localStorage');
          cookieAccepted = true;
        } else {
          logWarning('Cookie banner still visible after localStorage bypass');
        }
      } catch (error) {
        cookieError = String(error);
        logWarning(`Error bypassing cookies via localStorage: ${error}`);
      }
    }
    
    // Делаем скриншот после всех попыток закрытия cookie-баннера
    try {
      const screenshotPath = `./logs/cookie_banner_after.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      logInfo(`Saved post-cookie screenshot to ${screenshotPath}`);
      
      // Получаем диагностическую информацию о странице после обработки cookie
      const pageInfo = await page.evaluate(() => {
        return {
          url: window.location.href,
          htmlSize: document.documentElement.outerHTML.length,
          listingElementsFound: !!document.querySelector('article, [data-cy="listing-item"], [data-cy="search.listing"]'),
          iframesCount: document.querySelectorAll('iframe').length,
          bodyClasses: document.body.className,
          cookieBannerVisible: !!document.querySelector('#onetrust-banner-sdk, #onetrust-consent-sdk, [id*="cookie-banner"]')
        };
      });
      
      diagnosticInfo = { ...diagnosticInfo, ...pageInfo };
      logInfo(`Page diagnostic after cookie handling: ${JSON.stringify(pageInfo)}`);
    } catch (error) {
      logWarning(`Failed to save post-cookie diagnostic info: ${error}`);
    }
    
    // Записываем расширенную диагностику в JSON
    try {
      // Создаем объект диагностики cookie
      const cookieDiagnostic = {
        cookieAttempted,
        cookieAccepted,
        cookieError,
        timestamp: new Date().toISOString(),
        url: await page.url(),
        ...diagnosticInfo
      };
      
      // Сохраняем диагностику в файл
      const cookieDiagnosticPath = `./logs/cookie_diagnostic.json`;
      fs.writeFileSync(cookieDiagnosticPath, JSON.stringify(cookieDiagnostic, null, 2));
      logInfo(`Saved cookie diagnostic information to ${cookieDiagnosticPath}`);
    } catch (error) {
      logWarning(`Failed to save cookie diagnostic file: ${error}`);
    }
    
    // Если не получилось обработать cookie-баннер всеми методами
    if (!cookieAccepted && cookieAttempted) {
      logWarning('Failed to accept cookies after multiple attempts');
    }
    
    logInfo(`Cookie banner handled: ${cookieAccepted}`);
    return cookieAccepted;
  } catch (error) {
    logError(`Error handling cookie banner: ${error}`);
    
    // Сохраняем информацию об ошибке
    try {
      fs.writeFileSync('./logs/cookie_error.json', JSON.stringify({
        error: String(error),
        timestamp: new Date().toISOString(),
        cookieAttempted,
        cookieAccepted
      }, null, 2));
    } catch (e) {
      logError(`Failed to save cookie error info: ${e}`);
    }
    
    return false;
  }
}

/**
 * Имитирует естественную навигацию пользователя перед скрапингом
 */
async function simulateNaturalBrowsing(page: Page): Promise<void> {
  logInfo('Starting natural browsing simulation');
  
  try {
    // Посещаем главную страницу с более надежной стратегией загрузки
    logInfo('Visiting Otodom homepage');
    
    // Используем более надежные параметры и обработку ошибок
    try {
      // Первая попытка с load - быстрее и меньше шансов на таймаут
      await page.goto('https://www.otodom.pl/', { 
        waitUntil: 'load',
        timeout: 30000
      });
    } catch (navError) {
      logWarning(`Initial navigation error with 'load': ${navError}`);
      
      // Вторая попытка с domcontentloaded - еще более надежная
      try {
        await page.goto('https://www.otodom.pl/', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
      } catch (secondNavError) {
        logWarning(`Fallback navigation error with 'domcontentloaded': ${secondNavError}`);
        // Продолжаем выполнение даже при ошибке навигации
      }
    }
    
    // Дополнительно ждем когда сеть станет относительно неактивной
    try {
      // Ждем пока сеть станет "тихой" с небольшим таймаутом
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logInfo('Network remained active after navigation, continuing anyway');
      });
    } catch (stateError) {
      logWarning(`Error waiting for networkidle state: ${stateError}`);
    }
    
    // Логируем URL после загрузки страницы
    const currentUrl = page.url();
    logInfo(`Current URL after navigation: ${currentUrl}`);
    
    // Обрабатываем cookie-баннер если он есть
    const cookieBannerHandled = await handleCookieBanner(page);
    logInfo(`Cookie banner handled: ${cookieBannerHandled}`);
    
    // Случайная задержка как будто "смотрим главную"
    const homeDelay = getRandomDelay(
      DELAYS.NAVIGATION.MIN_AFTER_PAGE_LOAD,
      DELAYS.NAVIGATION.MAX_AFTER_PAGE_LOAD
    );
    logDebug(`Waiting for ${homeDelay}ms on homepage`);
    await new Promise(resolve => setTimeout(resolve, homeDelay));
    
    // Немного прокручиваем главную страницу
    await performRandomScrolling(page);
    
    // Переходим в раздел продажи с более надежной стратегией загрузки
    logInfo('Navigating to sales category');
    
    try {
      // Первая попытка с load - быстрее и меньше шансов на таймаут
      await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', { 
        waitUntil: 'load',
        timeout: 30000
      });
    } catch (navError) {
      logWarning(`Sales category navigation error with 'load': ${navError}`);
      
      // Вторая попытка с domcontentloaded - еще более надежная
      try {
        await page.goto('https://www.otodom.pl/pl/oferty/sprzedaz', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
      } catch (secondNavError) {
        logWarning(`Fallback sales navigation error with 'domcontentloaded': ${secondNavError}`);
        // Продолжаем выполнение даже при ошибке навигации
      }
    }
    
    // Дополнительно ждем когда сеть станет относительно неактивной
    try {
      // Ждем пока сеть станет "тихой" с небольшим таймаутом
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logInfo('Network remained active after sales navigation, continuing anyway');
      });
    } catch (stateError) {
      logWarning(`Error waiting for networkidle state in sales: ${stateError}`);
    }
    
    // Проверяем cookie-баннер еще раз (на всякий случай)
    await handleCookieBanner(page);
    
    // Еще одна задержка
    const categoryDelay = getRandomDelay(
      DELAYS.NAVIGATION.MIN_AFTER_PAGE_LOAD,
      DELAYS.NAVIGATION.MAX_AFTER_PAGE_LOAD
    );
    logDebug(`Waiting for ${categoryDelay}ms on category page`);
    await new Promise(resolve => setTimeout(resolve, categoryDelay));
    
    // Прокручиваем и страницу категории
    await performRandomScrolling(page);
    
    logInfo('Natural browsing simulation completed');
  } catch (error) {
    logError(`Error during natural browsing: ${error}`);
    throw error;
  }
}

/**
 * Получает строку запроса для определенного типа комнат
 */
function getRoomTypeQuery(roomType: string): string {
  return ROOM_TYPE_QUERIES[roomType as keyof typeof ROOM_TYPE_QUERIES] || 
         ROOM_TYPE_QUERIES.oneRoom;
}

/**
 * Извлекает общее число объявлений из текста на странице
 */
function extractReportedCount(text: string): number {
  const patterns = [
    /(\d+)\s+ogłosz/i,      // "123 ogłoszeń"
    /znaleziono\s+(\d+)/i,  // "znaleziono 123"
    /(\d+)\s+ofert/i,       // "123 ofert"
    /(\d+)\s+mieszk/i,      // "123 mieszkań"
    /(\d+)/                 // просто число
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  return 0;
}

/**
 * Парсит цену из текста объявления с валидацией
 */
function parsePrice(priceText: string): number {
  try {
    // Проверка на "Zapytaj o cenę" (Спросить о цене)
    if (priceText.toLowerCase().includes('zapytaj') || 
        (priceText.toLowerCase().includes('cen') && !priceText.toLowerCase().includes('zł'))) {
      logWarning(`Skipping "Zapytaj o cenę" listing (no price available)`);
      return 0;
    }
    
    // Удаляем все, кроме цифр
    const digits = priceText.replace(/[^\d]/g, '');
    if (!digits) return 0;
    
    const price = parseInt(digits, 10);
    
    // Валидация диапазона цен (50 тыс. - 10 млн. zł)
    const MIN_VALID_PRICE = 50000;   // 50 тыс. zł
    const MAX_VALID_PRICE = 10000000; // 10 млн. zł
    
    if (isNaN(price) || price < MIN_VALID_PRICE || price > MAX_VALID_PRICE) {
      logWarning(`Price out of valid range: ${price} zł (valid: ${MIN_VALID_PRICE}-${MAX_VALID_PRICE} zł)`);
      return 0;
    }
    
    return price;
  } catch (error) {
    logError(`Error parsing price "${priceText}": ${error}`);
    return 0;
  }
}

/**
 * Парсит площадь из текста объявления с валидацией
 */
function parseArea(areaText: string): number {
  try {
    // Извлекаем числа и заменяем запятую на точку
    const cleaned = areaText.replace(/[^\d,.]/g, '').replace(',', '.');
    if (!cleaned) return 0;
    
    const area = parseFloat(cleaned);
    
    // Валидация диапазона площади (10-1000 м²)
    const MIN_VALID_AREA = 10;  // 10 м²
    const MAX_VALID_AREA = 1000; // 1000 м²
    
    if (isNaN(area) || area < MIN_VALID_AREA || area > MAX_VALID_AREA) {
      logWarning(`Area out of valid range: ${area} m² (valid: ${MIN_VALID_AREA}-${MAX_VALID_AREA} m²)`);
      return 0;
    }
    
    return area;
  } catch (error) {
    logError(`Error parsing area "${areaText}": ${error}`);
    return 0;
  }
}

/**
 * Рассчитывает среднее значение массива чисел с защитой от переполнения
 */
function calculateAverage(values: number[]): number {
  try {
    if (values.length === 0) return 0;
    
    // Фильтруем нулевые значения и проверяем, что осталось хотя бы одно
    const nonZeroValues = values.filter(value => value > 0);
    if (nonZeroValues.length === 0) return 0;
    
    // Используем безопасный метод для суммирования
    let sum = 0;
    for (const value of nonZeroValues) {
      // Проверка на переполнение
      if (sum > Number.MAX_SAFE_INTEGER - value) {
        logWarning(`Potential numeric overflow during average calculation`);
        // Используем среднее арифметическое вместо суммы всех значений
        return Math.round(sum / nonZeroValues.length);
      }
      sum += value;
    }
    
    return Math.round(sum / nonZeroValues.length);
  } catch (error) {
    logError(`Error calculating average: ${error}`);
    return 0;
  }
}

/**
 * Обрабатывает текущую страницу и извлекает данные объявлений
 */
async function processCurrentPage(
  page: Page, 
  pageNum: number
): Promise<{
  prices: number[];
  areas: number[];
  pricesPerSqm: number[];
}> {
  logInfo(`Processing page ${pageNum}`);
  pagesProcessed++;
  
  // Ожидаем появления элементов с объявлениями
  try {
    await page.waitForSelector(
      'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
      { timeout: 15000 }
    );
  } catch (error) {
    logWarning(`Timeout waiting for listing elements on page ${pageNum}`);
    
    // Проверяем, не сработала ли защита
    const botDetected = await checkForBotDetection(page);
    if (botDetected) {
      throw new Error('Bot detection triggered while processing page');
    }
  }
  
  // Иногда прокручиваем страницу
  await performRandomScrolling(page);
  
  // Инициализация массивов для данных
  const prices: number[] = [];
  const areas: number[] = [];
  const pricesPerSqm: number[] = [];
  
  // Сделаем скриншот страницы для отладки
  try {
    const screenshotPath = `./logs/page_${pageNum}_screenshot.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    logInfo(`Saved screenshot to ${screenshotPath}`);
  } catch (screenshotError) {
    logWarning(`Failed to save screenshot: ${screenshotError}`);
  }

  // Извлекаем данные объявлений с текущей страницы
  // Использование более простого и надежного кода внутри эвала
  // Логируем текущий URL страницы
  const currentUrl = page.url();
  logInfo(`Current page URL: ${currentUrl}`);
  
  // Логируем HTML страницы для анализа
  const pageContent = await page.content();
  logInfo(`Page HTML length: ${pageContent.length} characters`);
  
  // Логируем основное содержимое страницы
  const mainContent = await page.evaluate(() => {
    const mainElement = document.querySelector('main');
    return mainElement ? mainElement.innerHTML.substring(0, 1000) : 'No main element found';
  });
  logInfo(`Main content preview: ${mainContent.substring(0, 200)}...`);
  
  const listingsData = await page.evaluate(() => {
    // Актуализированные селекторы для Otodom (2024)
    const selectors = [
      'article', 
      '[data-cy="listing-item"]', 
      '[data-cy="search.listing"]',
      'article[data-cy]',
      '[data-testid="listing-box"]',
      '[data-testid="listing-item"]',
      '[data-cy="search-listing-item"]',
      '.css-1qz6v50',
      'li[data-cy="listing-item"]',
      '[data-cy="frontend.search.listing-item"]',
      '.css-14cy79a',   // Новый селектор для карточек объявлений (2024)
      '[data-cy="frontend.search.listing.organic-result"]',
      '[data-cy="search-result.listing-item"]'
    ];
    
    // Логируем количество элементов по каждому селектору отдельно
    const counts: Record<string, number> = {};
    selectors.forEach(selector => {
      counts[selector] = document.querySelectorAll(selector).length;
    });
    
    console.log('Listing elements counts:', JSON.stringify(counts));
    
    // Комбинированный селектор
    const listings = Array.from(document.querySelectorAll(selectors.join(', ')));
    console.log('Total combined listings found:', listings.length);
    
    // Специфичные селекторы для цены и площади
    const priceSelectors = [
      '[data-testid="ad-price-value"]',
      '[data-cy="listing-item-price"]',
      '.e1jrxxb92', // Селектор для цены 2024
      '.css-s8wpzb', // Селектор для цены 2024
      '[data-cy="frontend.search.listing.organic-result.price"]',
      '[data-testid="listing-price"]'
    ];
    
    const areaSelectors = [
      '[data-testid="ad-area-value"]', 
      '[data-cy="listing-item-area"]',
      '.e1jrxxb96', // Селектор для площади 2024
      '.css-1kxf84n', // Селектор для площади 2024
      '[data-cy="frontend.search.listing.organic-result.area"]',
      '[data-testid="listing-area"]'
    ];
    
    // Обходим все найденные объявления
    return listings.map(listing => {
      // Пробуем сначала найти цену и площадь по специфическим селекторам
      let priceText = '';
      let areaText = '';
      
      // Проверяем специфические селекторы для цены
      for (const selector of priceSelectors) {
        const priceElement = listing.querySelector(selector);
        if (priceElement && priceElement.textContent) {
          priceText = priceElement.textContent.trim();
          break;
        }
      }
      
      // Проверяем специфические селекторы для площади
      for (const selector of areaSelectors) {
        const areaElement = listing.querySelector(selector);
        if (areaElement && areaElement.textContent) {
          areaText = areaElement.textContent.trim();
          break;
        }
      }
      
      // Если не найдены по специфическим селекторам, ищем по тексту
      if (!priceText || !areaText) {
        // Ищем элементы с ценой и площадью
        const textElements = listing.querySelectorAll('p, span, div, strong');
        const elements = Array.from(textElements);
        
        for (const el of elements) {
          const text = el.textContent?.trim() || '';
          if (!priceText && text.includes('zł')) {
            priceText = text;
          }
          if (!areaText && text.includes('m²')) {
            areaText = text;
          }
          
          // Если нашли и цену, и площадь, выходим из цикла
          if (priceText && areaText) break;
        }
      }
      
      // Полный текст объявления для запасного варианта
      const fullText = listing.textContent || '';
      
      return { priceText, areaText, fullText };
    });
  }).catch(error => {
    logError(`Error extracting listing data: ${error}`);
    return [];
  });
  
  logInfo(`Found ${listingsData.length} listings on page ${pageNum}`);
  
  // Обработка полученных данных
  for (let i = 0; i < listingsData.length; i++) {
    const item = listingsData[i];
    
    let finalPriceText = item.priceText;
    let finalAreaText = item.areaText;
    
    // Если не удалось найти данные стандартным способом,
    // пробуем извлечь из полного текста объявления
    if (!finalPriceText || !finalAreaText) {
      // Извлечение цены
      if (!finalPriceText) {
        const priceMatch = item.fullText.match(/(\d[\d\s]*[\d])\s*zł/i);
        if (priceMatch) {
          finalPriceText = priceMatch[0];
        }
      }
      
      // Извлечение площади
      if (!finalAreaText) {
        const areaMatch = item.fullText.match(/(\d[\d\s,.]*[\d])\s*m²/i);
        if (areaMatch) {
          finalAreaText = areaMatch[0];
        }
      }
    }
    
    // Если нашли оба значения, обрабатываем их
    if (finalPriceText && finalAreaText) {
      const price = parsePrice(finalPriceText);
      const area = parseArea(finalAreaText);
      
      if (price > 0 && area > 0) {
        // Расчет цены за квадратный метр
        const pricePerSqm = Math.round(price / area);
        
        // Добавляем данные в соответствующие массивы
        prices.push(price);
        areas.push(area);
        pricesPerSqm.push(pricePerSqm);
        
        logDebug(`Item ${i+1}: price=${price}, area=${area}, price/m²=${pricePerSqm}`);
      } else {
        logWarning(`Invalid values for item ${i+1}: price=${price}, area=${area}`);
      }
    } else {
      logWarning(`Missing data for item ${i+1}: price=${!!finalPriceText}, area=${!!finalAreaText}`);
    }
  }
  
  logInfo(`Successfully processed ${prices.length}/${listingsData.length} listings on page ${pageNum}`);
  
  return { prices, areas, pricesPerSqm };
}

/**
 * Интерфейс для результатов анализа страницы
 */
interface PageAnalysisResult {
  dataCyAttributes: string[];
  h1Texts: string[];
  mainCount: number;
  articleCount: number;
  firstArticleData: any;
  foundSelectors: Record<string, boolean>;
  elementCountBySelector: Record<string, number>;
  missingSelectors: string[];
  possibleErrors: string[];
  hasMainContent: boolean;
  hasListings: boolean;
}

/**
 * Интерфейс для результатов обработки первой страницы
 */
interface FirstPageResult {
  prices: number[];
  areas: number[];
  pricesPerSqm: number[];
  reportedCount: number;
  hasCookieBanner: boolean;
  foundSelectors: Record<string, boolean>;
  elementCountBySelector: Record<string, number>;
  h1Texts: string[];
  pageStatus: {
    hasMainContent: boolean;
    hasListings: boolean;
    missingSelectors: string[];
    possibleErrors: string[];
  };
}

/**
 * Обрабатывает первую страницу результатов поиска с расширенной аналитикой
 */
async function processFirstPage(
  page: Page
): Promise<FirstPageResult> {
  logInfo('Processing first page of results with enhanced diagnostics');
  
  // Проверяем наличие cookie-баннера
  const hasCookieBanner = await handleCookieBanner(page);
  
  // Делаем диагностический скриншот страницы после возможной обработки cookie
  try {
    const screenshotPath = `./logs/search_page_diagnostic.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    logInfo(`Saved diagnostic screenshot to ${screenshotPath}`);
  } catch (screenshotError) {
    logWarning(`Failed to save diagnostic screenshot: ${screenshotError}`);
  }
  
  // Расширенный список селекторов для поиска количества объявлений
  const countSelectors = [
    '[data-cy="search.listing-panel.label.ads-number"]',
    'h1', 
    '.css-1j1z8qy', 
    '[data-cy="search-listing.status.header"]',
    // Новые 2024
    '[data-testid="listing-counter"]',
    '[data-cy="frontend.search.results-count"]',
    '[data-cy="search-result.listing-items-counter"]',
    '.css-19fk5ox'
  ];
  
  // Пытаемся извлечь текст с количеством объявлений, проверяя каждый селектор
  let countText = '';
  let foundCountSelector = '';
  
  for (const selector of countSelectors) {
    const element = await page.$(selector);
    if (element) {
      const text = await element.textContent() || '';
      if (text && text.trim()) {
        countText = text.trim();
        foundCountSelector = selector;
        break;
      }
    }
  }
  
  if (!countText) {
    countText = await page.textContent('h1') || '';
    logWarning(`Using h1 fallback for count text: "${countText}"`);
  }
  
  logInfo(`Count text found with selector "${foundCountSelector}": "${countText}"`);
  
  // Расширенное логирование элементов страницы для анализа
  const pageAnalysis = await page.evaluate(() => {
    // Возможные селекторы для элементов листинга
    const listingSelectors = [
      'article', 
      '[data-cy="listing-item"]', 
      '[data-cy="search.listing"]',
      'article[data-cy]',
      '[data-testid="listing-box"]',
      '[data-testid="listing-item"]',
      '[data-cy="search-listing-item"]',
      '.css-1qz6v50',
      'li[data-cy="listing-item"]',
      '[data-cy="frontend.search.listing-item"]',
      '.css-14cy79a',
      '[data-cy="frontend.search.listing.organic-result"]'
    ];
    
    // Собираем информацию о наличии и количестве элементов по каждому селектору
    const elementCountBySelector: Record<string, number> = {};
    const foundSelectors: Record<string, boolean> = {};
    const missingSelectors: string[] = [];
    
    listingSelectors.forEach(selector => {
      const count = document.querySelectorAll(selector).length;
      elementCountBySelector[selector] = count;
      foundSelectors[selector] = count > 0;
      
      if (count === 0) {
        missingSelectors.push(selector);
      }
    });
    
    // Ищем все элементы с data-cy атрибутами для отладки
    const allDataCyElements = document.querySelectorAll('*[data-cy]');
    const dataCyValues = Array.from(allDataCyElements)
      .map(el => el.getAttribute('data-cy'))
      .filter(Boolean);
    
    // Ищем элементы с количеством объявлений
    const h1Elements = document.querySelectorAll('h1');
    const h1Texts = Array.from(h1Elements).map(el => el.textContent || '');
    
    // Ищем секцию с листингами и main
    const mainElements = document.querySelectorAll('main');
    const articleElements = document.querySelectorAll('article');
    
    // Собираем атрибуты первого article элемента, если он есть
    let firstArticleData = {};
    if (articleElements.length > 0) {
      const firstArticle = articleElements[0];
      firstArticleData = {
        className: firstArticle.className,
        dataAttributes: Array.from(firstArticle.attributes)
          .filter(attr => attr.name.startsWith('data-'))
          .map(attr => `${attr.name}="${attr.value}"`)
      };
    }
    
    // Проверяем наличие сообщений об ошибках или отсутствии результатов
    const possibleErrors: string[] = [];
    const errorSelectors = [
      '.css-18qrgpr', // Типичный селектор для сообщений об ошибках
      '[data-testid="error-message"]',
      '[data-cy="search-result.no-results-message"]'
    ];
    
    errorSelectors.forEach(selector => {
      const errorElement = document.querySelector(selector);
      if (errorElement && errorElement.textContent) {
        possibleErrors.push(`${selector}: ${errorElement.textContent.trim()}`);
      }
    });
    
    // Проверяем текст всей страницы на ошибки
    const bodyText = document.body.textContent || '';
    const errorKeywords = [
      'no results', 'not found', 'brak wyników', 
      'nie znaleziono', 'przepraszamy', 'sorry', 
      'error', 'błąd'
    ];
    
    errorKeywords.forEach(keyword => {
      if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
        possibleErrors.push(`Error keyword found: "${keyword}"`);
      }
    });
    
    return {
      dataCyAttributes: dataCyValues.slice(0, 20),
      h1Texts,
      mainCount: mainElements.length,
      articleCount: articleElements.length,
      firstArticleData,
      foundSelectors,
      elementCountBySelector,
      missingSelectors,
      possibleErrors,
      hasMainContent: mainElements.length > 0,
      hasListings: articleElements.length > 0 || 
                  listingSelectors.some(selector => document.querySelectorAll(selector).length > 0)
    };
  });
  
  // Логируем полученные данные
  logInfo('Page analysis results:');
  logInfo(`Main elements found: ${pageAnalysis.mainCount}`);
  logInfo(`Article elements found: ${pageAnalysis.articleCount}`);
  logInfo(`H1 texts: ${JSON.stringify(pageAnalysis.h1Texts)}`);
  logInfo(`Data-cy attributes: ${JSON.stringify(pageAnalysis.dataCyAttributes)}`);
  logInfo(`Found selectors: ${JSON.stringify(pageAnalysis.foundSelectors)}`);
  logInfo(`Missing selectors: ${JSON.stringify(pageAnalysis.missingSelectors)}`);
  
  if (pageAnalysis.possibleErrors.length > 0) {
    logWarning(`Possible errors on page: ${JSON.stringify(pageAnalysis.possibleErrors)}`);
  }
  
  // Извлекаем количество объявлений
  const reportedCount = extractReportedCount(countText);
  logInfo(`Reported listings count: ${reportedCount}`);
  
  // Дополнительные проверки на случай, если reportedCount = 0
  if (reportedCount === 0 && pageAnalysis.hasListings) {
    // Есть объявления на странице, но не смогли извлечь их количество
    logWarning('Found listings on page but couldn\'t extract reported count');
  } else if (reportedCount === 0 && !pageAnalysis.hasListings) {
    // Нет объявлений на странице
    logWarning('No listings found on page and reported count is 0');
    
    // Сохраняем полный HTML для дальнейшего анализа
    const htmlContent = await page.content();
    try {
      fs.writeFileSync('./logs/no_results_page.html', htmlContent);
      logInfo('Saved full HTML of page with no results for analysis');
    } catch (error) {
      logError(`Failed to save HTML content: ${error}`);
    }
  }
  
  // Обрабатываем первую страницу для извлечения данных объявлений
  const pageData = await processCurrentPage(page, 1);
  
  return { 
    ...pageData, 
    reportedCount,
    hasCookieBanner,
    foundSelectors: pageAnalysis.foundSelectors,
    elementCountBySelector: pageAnalysis.elementCountBySelector,
    h1Texts: pageAnalysis.h1Texts,
    pageStatus: {
      hasMainContent: pageAnalysis.hasMainContent,
      hasListings: pageAnalysis.hasListings,
      missingSelectors: pageAnalysis.missingSelectors,
      possibleErrors: pageAnalysis.possibleErrors
    }
  };
}

/**
 * Переходит на следующую страницу результатов
 */
async function navigateToNextPage(page: Page, currentPageNum: number): Promise<boolean> {
  logInfo(`Attempting to navigate to page ${currentPageNum + 1}`);
  
  // Логируем текущий URL перед навигацией
  const currentUrl = page.url();
  logInfo(`Current URL before navigation: ${currentUrl}`);
  
  // Пробуем найти элементы пагинации с использованием разных селекторов
  const selectors = [
    'a[data-cy="pagination.next-page"], a[data-direction="next"]',
    'a.pagination__next-page',
    '.pagination__page--next a, .pagination__page--next button',
    '[aria-label="Next page"], [aria-label="Następna strona"]',
    '.css-1rzik0f'
  ];
  
  for (const selector of selectors) {
    const nextPageLink = await page.$(selector);
    if (nextPageLink) {
      try {
        logInfo(`Found next page link with selector: ${selector}`);
        await nextPageLink.click();
        
        // Ожидаем загрузки страницы
        await page.waitForLoadState('networkidle', { timeout: 10000 })
          .catch(e => logWarning(`Timeout waiting for next page: ${e}`));
        
        // Дополнительная проверка, загрузились ли объявления
        const hasListings = await page.waitForSelector(
          'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
          { timeout: 15000 }
        ).then(() => true).catch(() => false);
        
        if (!hasListings) {
          logWarning('No listings found after pagination');
          return false;
        }
        
        // Проверяем что URL изменился (содержит номер страницы или параметр page)
        const newUrl = page.url();
        const urlChanged = newUrl !== currentUrl;
        
        if (urlChanged) {
          logInfo(`Successfully navigated to next page. New URL: ${newUrl}`);
          return true;
        } else {
          logWarning('URL did not change after pagination click');
        }
      } catch (error) {
        logWarning(`Error clicking next page link: ${error}`);
      }
    }
  }
  
  // Если не смогли по ссылкам, пробуем напрямую перейти по URL с параметром страницы
  try {
    const parsedUrl = new URL(currentUrl);
    parsedUrl.searchParams.set('page', (currentPageNum + 1).toString());
    const nextPageUrl = parsedUrl.toString();
    
    logInfo(`Attempting direct navigation to: ${nextPageUrl}`);
    await page.goto(nextPageUrl, { waitUntil: 'networkidle' });
    
    // Проверяем, что URL действительно изменился
    const newUrl = page.url();
    
    // Экстра-проверка на случай редиректа обратно на первую страницу
    if (newUrl.includes(`page=${currentPageNum + 1}`) || newUrl.includes(`page%3D${currentPageNum + 1}`)) {
      logInfo(`Successfully navigated to next page via direct URL. New URL: ${newUrl}`);
      return true;
    } else {
      logWarning(`Navigated to unexpected URL: ${newUrl}`);
      return false;
    }
  } catch (error) {
    logError(`Error during direct page navigation: ${error}`);
    return false;
  }
}

/**
 * Функция для выполнения скрапинга с повторными попытками
 */
async function runWithRetry<T>(
  task: () => Promise<T>,
  taskName: string,
  maxRetries: number = RETRY.MAX_RETRIES
): Promise<T> {
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount < maxRetries) {
    try {
      if (retryCount > 0) {
        logInfo(`Retry ${retryCount}/${maxRetries} for task: ${taskName}`);
      }
      
      const result = await task();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logError(`Error in task "${taskName}" (attempt ${retryCount + 1}/${maxRetries}): ${error}`);
      retryCount++;
      
      // Экспоненциальное увеличение времени задержки между попытками
      const delay = Math.min(
        30000,
        1000 * Math.pow(2, retryCount)
      );
      
      logInfo(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries for task "${taskName}": ${lastError?.message}`);
}

/**
 * Сохраняет результаты скрапинга в промежуточный файл и отдельный test_task.json
 */
function saveIntermediateResults(task: ScrapeTask, results: any, diagnosticInfo?: any): void {
  try {
    // Сохраняем стандартный файл результатов
    const filename = `${task.cityNormalized}_${task.districtSearchTerm}_${task.roomType}_${task.id}.json`;
    const filePath = path.join(RESULTS_DIR, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
    logDebug(`Saved intermediate results for task ${task.id} to ${filename}`);
    
    // Сохраняем диагностический test_task.json
    const testTaskPath = path.join(RESULTS_DIR, 'test_task.json');
    
    // Загружаем cookie диагностику, если файл существует
    interface CookieDiagnostic {
      cookieAttempted?: boolean;
      cookieAccepted?: boolean;
      cookieError?: string;
      url?: string;
      jsEvalResult?: {
        listingElementsFound?: boolean;
        bodyHtml?: number;
      };
      [key: string]: any;
    }
    
    let cookieDiagnostic: CookieDiagnostic = {};
    try {
      const cookieDiagnosticPath = './logs/cookie_diagnostic.json';
      if (fs.existsSync(cookieDiagnosticPath)) {
        const cookieData = fs.readFileSync(cookieDiagnosticPath, 'utf8');
        cookieDiagnostic = JSON.parse(cookieData);
        logInfo('Loaded cookie diagnostic data for test_task.json');
      }
    } catch (cookieError) {
      logWarning(`Failed to load cookie diagnostic: ${cookieError}`);
    }
    
    // Получаем информацию о состоянии страниц в логах
    interface ScreenshotInfo {
      name: string;
      path: string;
      timestamp: string;
    }
    
    let pageScreenshots: ScreenshotInfo[] = [];
    try {
      const logDir = './logs';
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        pageScreenshots = files
          .filter(file => file.endsWith('.png'))
          .map(file => ({
            name: file,
            path: `${logDir}/${file}`,
            timestamp: fs.statSync(`${logDir}/${file}`).mtime.toISOString()
          }));
      }
    } catch (screenshotError) {
      logWarning(`Failed to list screenshots: ${screenshotError}`);
    }
    
    // Добавляем расширенную диагностику по формату, предложенному заказчиком
    const enhancedDiagnostics = {
      cookieAttempted: cookieDiagnostic.cookieAttempted || false,
      cookieAccepted: cookieDiagnostic.cookieAccepted || false,
      cookieError: cookieDiagnostic.cookieError || "",
      listingElementsFound: 
        results.count > 0 || 
        (diagnosticInfo?.pageStatus?.hasListings === true) || 
        (cookieDiagnostic.jsEvalResult?.listingElementsFound === true) || 
        false,
      pageUrl: cookieDiagnostic.url || "",
      htmlSize: cookieDiagnostic.jsEvalResult?.bodyHtml || 0,
      screenhotsTaken: pageScreenshots,
      browserMemoryUsage: getCurrentMemoryUsage()
    };
    
    // Объединяем основные результаты с диагностической информацией
    const extendedResults = {
      ...results,
      task: {
        id: task.id,
        cityUrl: task.cityUrl,
        cityNormalized: task.cityNormalized,
        districtName: task.districtName,
        districtSearchTerm: task.districtSearchTerm,
        roomType: task.roomType,
        fetchDate: task.fetchDate,
        status: task.status,
      },
      diagnostics: {
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - new Date(task.startedAt || Date.now()).getTime(),
        environment: {
          memoryUsageMb: getCurrentMemoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        },
        // Добавляем дополнительную диагностическую информацию, если она есть
        ...diagnosticInfo,
        // Добавляем расширенную диагностику
        ...enhancedDiagnostics,
        // Если есть raw данные о cookie из оригинального файла
        cookieRawData: cookieDiagnostic
      }
    };
    
    fs.writeFileSync(testTaskPath, JSON.stringify(extendedResults, null, 2), 'utf8');
    logInfo(`Saved enhanced diagnostic results to test_task.json`);
  } catch (error) {
    logError(`Failed to save results: ${error}`);
  }
}

/**
 * Основная функция для скрапинга данных о недвижимости
 */
async function scrapePropertyData(task: ScrapeTask): Promise<any> {
  
  logInfo(`Starting scrape task ${task.id}: ${task.cityNormalized}/${task.districtName}/${task.roomType}`);
  
  let localBrowser: Browser | null = null;
  let localContext: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // Закрываем существующий браузер, если есть
    if (browser) {
      await closeBrowser().catch(e => logError(`Error closing existing browser: ${e}`));
    }
    
    // Всегда начинаем с чистого состояния
    logInfo('Browser needs initialization or restart');
    
    // Инициализируем новый браузер и контекст для каждой задачи
    try {
      localBrowser = await initBrowser();
      if (!localBrowser) {
        throw new Error('Failed to initialize browser');
      }
      
      localContext = await createContext(localBrowser);
      if (!localContext) {
        throw new Error('Failed to create browser context');
      }
    } catch (initError) {
      // Если не удалось инициализировать браузер, логируем и пробуем еще раз
      logError(`Error initializing browser: ${initError}`);
      
      // Повторная попытка с задержкой
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      localBrowser = await initBrowser();
      localContext = await createContext(localBrowser);
    }
    
    // Создаем новую страницу
    page = await localContext.newPage();
    await setupPage(page);
    
    // Конструируем URL для скрапинга
    const baseUrl = `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${task.cityUrl}/${task.districtSearchTerm}`;
    const roomTypeQuery = getRoomTypeQuery(task.roomType);
    const fullUrl = `${baseUrl}${roomTypeQuery}`;
    
    // Имитируем естественное поведение перед основным запросом
    await runWithRetry(
      () => simulateNaturalBrowsing(page!),
      'Natural browsing simulation'
    );
    
    // Переходим на страницу поиска
    logInfo(`Navigating to search URL: ${fullUrl}`);
    await runWithRetry(
      async () => {
        await page!.goto(fullUrl, { waitUntil: 'networkidle' });
        
        // Проверка на загрузку содержимого и антибот-защиту
        const hasListings = await page!.waitForSelector(
          'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
          { timeout: 15000 }
        ).then(() => true).catch(() => false);
        
        if (!hasListings) {
          const botDetected = await checkForBotDetection(page!);
          if (botDetected) {
            throw new Error('Bot detection triggered on search page');
          }
          
          throw new Error('No listing elements found on search page');
        }
        
        return true;
      },
      'Search page navigation'
    );
    
    // Иногда случайно посещаем объявление для имитации пользователя
    await visitRandomListing(page);
    
    // Обрабатываем первую страницу с расширенной диагностикой
    const firstPageResults = await runWithRetry(
      () => processFirstPage(page!),
      'First page processing'
    );
    
    // Делаем скриншот состояния после обработки первой страницы
    try {
      const afterProcessingScreenshotPath = `./logs/after_first_page_processing.png`;
      await page.screenshot({ path: afterProcessingScreenshotPath, fullPage: false });
      logInfo(`Saved after-processing screenshot to ${afterProcessingScreenshotPath}`);
    } catch (screenshotError) {
      logWarning(`Failed to save after-processing screenshot: ${screenshotError}`);
    }
    
    // Извлекаем базовые данные из результатов
    const { 
      prices, 
      areas, 
      pricesPerSqm, 
      reportedCount,
      hasCookieBanner,
      foundSelectors,
      elementCountBySelector,
      h1Texts,
      pageStatus
    } = firstPageResults;
    
    // Создаем диагностическую информацию
    const diagnosticInfo = {
      pageStatus: {
        ...pageStatus,
        hasListings: pageStatus.hasListings,
        hasMainContent: pageStatus.hasMainContent,
        h1Texts,
        hasCookieBanner
      },
      selectors: {
        foundSelectors,
        elementCountBySelector,
        missingSelectors: pageStatus.missingSelectors
      },
      botDetection: {
        botDetected: await checkForBotDetection(page!),
        errors: pageStatus.possibleErrors
      },
      screenshots: {
        beforeCookieBanner: './logs/cookie_banner_before.png',
        afterCookieBanner: './logs/cookie_banner_after.png',
        searchPage: './logs/search_page_diagnostic.png',
        afterProcessing: './logs/after_first_page_processing.png'
      }
    };
    
    // Логируем подробную диагностическую информацию
    logInfo(`Diagnostic info after first page processing:`);
    logInfo(`Cookie banner detected: ${hasCookieBanner}`);
    logInfo(`Bot detection result: ${diagnosticInfo.botDetection.botDetected}`);
    logInfo(`Elements found: ${JSON.stringify(Object.keys(foundSelectors).filter(key => foundSelectors[key]))}`);
    logInfo(`Main content present: ${pageStatus.hasMainContent}`);
    logInfo(`Listings detected: ${pageStatus.hasListings}`);
    
    if (pageStatus.possibleErrors.length > 0) {
      logWarning(`Page errors detected: ${JSON.stringify(pageStatus.possibleErrors)}`);
    }
    
    // Инициализация счетчиков для пагинации
    let currentPage = 1;
    let consecutiveErrors = 0;
    
    // Определение максимального количества страниц
    // Если reportedCount > 0, вычисляем примерное количество страниц (72 объявления на страницу)
    const estimatedPages = reportedCount > 0 ? Math.ceil(reportedCount / 72) : 5;
    const maxPages = Math.min(estimatedPages, 20);
    
    logInfo(`Planning to process up to ${maxPages} pages (estimated from ${reportedCount} listings)`);
    
    // Промежуточные результаты первой страницы
    let results = {
      count: prices.length,
      reportedCount,
      avgPrice: calculateAverage(prices),
      avgPricePerSqm: calculateAverage(pricesPerSqm),
      prices,
      pricesPerSqm,
      // Добавляем базовую диагностическую информацию в результаты
      hasListings: pageStatus.hasListings,
      botDetected: diagnosticInfo.botDetection.botDetected,
      missingSelectors: pageStatus.missingSelectors.length > 0,
      hasCookieBanner,
      hasErrors: pageStatus.possibleErrors.length > 0,
      errorMessages: pageStatus.possibleErrors
    };
    
    // Сохраняем промежуточные результаты с диагностической информацией
    saveIntermediateResults(task, results, diagnosticInfo);
    
    // Обрабатываем дополнительные страницы (не более maxPages)
    while (currentPage < maxPages && consecutiveErrors < RETRY.MAX_RETRIES) {
      // Проверяем состояние браузера и перезапускаем при необходимости
      if (!(await checkBrowserHealth())) {
        logInfo('Browser needs restart due to resource constraints');
        
        // Закрываем текущую страницу
        if (page) await page.close().catch(e => logError(`Error closing page: ${e}`));
        
        // Инициализируем заново
        localBrowser = await initBrowser();
        localContext = await createContext(localBrowser);
        page = await localContext.newPage();
        await setupPage(page);
        
        // Переходим сразу на нужную страницу пагинации
        const paginatedUrl = `${fullUrl}&page=${currentPage + 1}`;
        
        await runWithRetry(
          async () => {
            await page!.goto(paginatedUrl, { waitUntil: 'networkidle' });
            
            const hasListings = await page!.waitForSelector(
              'article, [data-cy="listing-item"], [data-cy="search.listing"]', 
              { timeout: 15000 }
            ).then(() => true).catch(() => false);
            
            if (!hasListings) {
              throw new Error('No listing elements found after browser restart');
            }
            
            return true;
          },
          'Paginated page navigation after browser restart'
        );
      } else {
        // Переходим на следующую страницу
        const navigationSuccess = await runWithRetry(
          () => navigateToNextPage(page!, currentPage),
          `Navigation to page ${currentPage + 1}`,
          2 // Меньше попыток, возможно, нет следующей страницы
        ).catch(error => {
          logWarning(`Failed to navigate to next page: ${error}`);
          return false;
        });
        
        if (!navigationSuccess) {
          logInfo(`No more pages available after page ${currentPage}`);
          break;
        }
      }
      
      // Увеличиваем счетчик страниц
      currentPage++;
      
      try {
        // Иногда случайно посещаем объявление для имитации пользователя
        await visitRandomListing(page);
        
        // Обрабатываем текущую страницу
        const pageData = await runWithRetry(
          () => processCurrentPage(page!, currentPage),
          `Processing page ${currentPage}`
        );
        
        // Добавляем данные в общие массивы
        prices.push(...pageData.prices);
        areas.push(...pageData.areas);
        pricesPerSqm.push(...pageData.pricesPerSqm);
        
        // Обновляем результаты с сохранением диагностической информации
        results = {
          count: prices.length,
          reportedCount,
          avgPrice: calculateAverage(prices),
          avgPricePerSqm: calculateAverage(pricesPerSqm),
          prices,
          pricesPerSqm,
          // Сохраняем диагностическую информацию
          hasListings: pageStatus.hasListings,
          botDetected: diagnosticInfo.botDetection.botDetected,
          missingSelectors: pageStatus.missingSelectors.length > 0,
          hasCookieBanner,
          hasErrors: pageStatus.possibleErrors.length > 0,
          errorMessages: pageStatus.possibleErrors
        };
        
        // Сохраняем промежуточные результаты
        saveIntermediateResults(task, results);
        
        // Сбрасываем счетчик ошибок
        consecutiveErrors = 0;
      } catch (error) {
        logError(`Error processing page ${currentPage}: ${error}`);
        consecutiveErrors++;
        
        if (consecutiveErrors >= RETRY.MAX_RETRIES) {
          logWarning(`Stopping pagination after ${consecutiveErrors} consecutive errors`);
          break;
        }
      }
      
      // Задержка между страницами
      const delay = getRandomDelay(
        DELAYS.ACTIONS.MIN_BETWEEN_PAGES,
        DELAYS.ACTIONS.MAX_BETWEEN_PAGES
      );
      logDebug(`Waiting ${delay}ms before next page`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Финальный расчет средних показателей
    const avgPrice = calculateAverage(prices);
    const avgPricePerSqm = calculateAverage(pricesPerSqm);
    
    // Подготовка финального результата с диагностической информацией
    const result = {
      count: prices.length,
      reportedCount,
      avgPrice,
      avgPricePerSqm,
      prices,
      pricesPerSqm,
      // Сохраняем диагностическую информацию
      hasListings: pageStatus.hasListings,
      botDetected: diagnosticInfo.botDetection.botDetected,
      missingSelectors: pageStatus.missingSelectors.length > 0,
      hasCookieBanner,
      hasErrors: pageStatus.possibleErrors.length > 0,
      errorMessages: pageStatus.possibleErrors
    };
    
    // Сохраняем финальный результат в test_task.json
    saveIntermediateResults(task, result, diagnosticInfo);
    
    logInfo(`Scraping completed for ${task.districtName} (${task.roomType}): ${prices.length} listings found`);
    return result;
  } catch (error) {
    // Делаем скриншот при ошибке
    try {
      if (page) {
        const errorScreenshotPath = `./logs/error_screenshot_${task.id}.png`;
        await page.screenshot({ path: errorScreenshotPath, fullPage: false });
        logInfo(`Saved error screenshot to ${errorScreenshotPath}`);
      }
    } catch (screenshotError) {
      logWarning(`Failed to save error screenshot: ${screenshotError}`);
    }
    
    // Сохраняем HTML страницы при ошибке
    try {
      if (page) {
        const htmlContent = await page.content();
        const errorHtmlPath = `./logs/error_page_${task.id}.html`;
        fs.writeFileSync(errorHtmlPath, htmlContent);
        logInfo(`Saved error page HTML to ${errorHtmlPath}`);
      }
    } catch (htmlError) {
      logWarning(`Failed to save error page HTML: ${htmlError}`);
    }
    
    // Создаем результат с информацией об ошибке
    const errorResults = {
      count: 0,
      reportedCount: 0,
      avgPrice: 0,
      avgPricePerSqm: 0,
      prices: [],
      pricesPerSqm: [],
      error: true,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      botDetected: page ? await checkForBotDetection(page).catch(() => true) : true
    };
    
    // Создаем диагностическую информацию об ошибке
    const errorDiagnostics = {
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      },
      screenshots: {
        error: `./logs/error_screenshot_${task.id}.png`,
        errorHtml: `./logs/error_page_${task.id}.html`
      },
      environment: {
        memoryUsageMb: getCurrentMemoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    // Сохраняем информацию об ошибке в test_task.json
    saveIntermediateResults(task, errorResults, errorDiagnostics);
    
    logError(`Critical error during scraping task ${task.id}: ${error}`);
    throw error;
  } finally {
    try {
      // Закрываем страницу
      if (page) {
        await page.close().catch(e => logError(`Error closing page: ${e}`));
      }
      
      // Всегда закрываем использованные ресурсы после каждой задачи
      if (localContext) {
        await localContext.close().catch(e => logError(`Error closing context: ${e}`));
      }
      
      if (localBrowser) {
        await localBrowser.close().catch(e => logError(`Error closing browser: ${e}`));
      }
      
      // Сбрасываем глобальные ссылки
      browser = null;
      context = null;
    } catch (cleanupError) {
      logError(`Error during browser cleanup: ${cleanupError}`);
    } finally {
      // Логируем использование памяти
      logMemoryUsage();
      
      // Принудительная сборка мусора
      if (global.gc) {
        try {
          global.gc();
        } catch (gcError) {
          logError(`Error during garbage collection: ${gcError}`);
        }
      }
    }
  }
}

// Регистрируем скрапер как обработчик задач
registerTaskProcessor(scrapePropertyData);

// Запускаем проверку памяти по интервалу
setInterval(() => {
  const memoryMb = getCurrentMemoryUsage();
  if (memoryMb > RESOURCE_LIMITS.MEMORY.WARNING_THRESHOLD) {
    logWarning(`Periodic memory check: High memory usage: ${memoryMb} MB`);
    if (memoryMb > RESOURCE_LIMITS.MEMORY.CRITICAL_THRESHOLD) {
      logWarning(`Critical memory threshold exceeded: ${memoryMb} MB. Restarting browser.`);
      closeBrowser().catch(e => logError(`Error closing browser during memory check: ${e}`));
    }
  }
}, RESOURCE_LIMITS.MEMORY.CHECK_INTERVAL);

// Экспортируем функции
export { scrapePropertyData, closeBrowser, checkBrowserHealth };
