/**
 * Quick Session Test Scraper
 * 
 * Упрощенная версия скрапера с ручной сессией для быстрой проверки
 * возможности обхода CloudFront.
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

// Основные параметры
const LOG_DIR = './logs/quick_test';
const COOKIES_FILE = './attached_assets/Pasted-1-Cookie-cooki-1745927642029.txt';
const TARGET_URL = 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie';
const TIMEOUT_MS = 30000; // Сокращенный таймаут - 30 секунд

// Создаем директорию для логов
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Функция для логирования
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(path.join(LOG_DIR, 'log.txt'), formattedMessage + '\n');
}

// Основная функция
async function quickSessionTest(): Promise<void> {
  log('=== STARTING QUICK SESSION TEST ===');
  
  // Глобальный таймаут
  const timeoutId = setTimeout(() => {
    log('⚠️ TIMEOUT: Global execution time exceeded');
    process.exit(1);
  }, TIMEOUT_MS);
  
  let browser = null;
  
  try {
    // 1. Загружаем данные сессии
    log('Loading cookies from file...');
    const sessionData = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
    log(`✓ Loaded ${sessionData.cookies.length} cookies`);
    
    // 2. Запускаем браузер в минимальной конфигурации
    log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ],
      timeout: 15000
    });
    log('✓ Browser launched');
    
    // 3. Создаем контекст
    log('Creating browser context...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
      timezoneId: 'Europe/Warsaw',
      viewport: { width: 1920, height: 1080 }
    });
    log('✓ Context created');
    
    // 4. Добавляем cookies
    log('Setting cookies...');
    await context.addCookies(sessionData.cookies);
    log('✓ Cookies set');
    
    // 5. Создаем страницу
    log('Creating page...');
    const page = await context.newPage();
    log('✓ Page created');
    
    // 6. Переходим на целевую страницу
    log(`Navigating to ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    
    if (!response) {
      throw new Error('No response received');
    }
    
    log(`✓ Page loaded with status: ${response.status()}`);
    log(`Page title: ${await page.title()}`);
    
    // 7. Сразу сохраняем скриншот
    const screenshotPath = path.join(LOG_DIR, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    log(`✓ Screenshot saved to: ${screenshotPath}`);
    
    // 8. Сохраняем HTML
    const htmlPath = path.join(LOG_DIR, 'page.html');
    fs.writeFileSync(htmlPath, await page.content());
    log(`✓ HTML saved to: ${htmlPath}`);
    
    // 9. Проверяем наличие элементов списка
    const hasListings = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const countElement = document.querySelector('[data-cy="search.listing-panel.label"]');
      return {
        articleCount: articles.length,
        countText: countElement ? countElement.textContent : null
      };
    });
    
    log(`Found ${hasListings.articleCount} article elements`);
    log(`Listing count text: ${hasListings.countText || 'Not found'}`);
    
    if (hasListings.articleCount > 0) {
      log('✅ SUCCESS: Listings found! CloudFront protection bypassed successfully');
    } else {
      log('⚠️ WARNING: No listings found, might still be blocked');
    }
    
    // 10. Сохраняем результаты
    fs.writeFileSync(path.join(LOG_DIR, 'results.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      status: response.status(),
      title: await page.title(),
      url: page.url(),
      articleCount: hasListings.articleCount,
      countText: hasListings.countText,
      success: hasListings.articleCount > 0
    }, null, 2));
    
    log('✅ Test completed successfully');
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    fs.writeFileSync(path.join(LOG_DIR, 'error.txt'), String(error.stack || error));
  } finally {
    // Очистка ресурсов
    clearTimeout(timeoutId);
    
    if (browser) {
      try {
        await browser.close();
        log('Browser closed');
      } catch (e) {
        log(`Error closing browser: ${e.message}`);
      }
    }
    
    log('=== TEST FINISHED ===');
  }
}

// Запускаем тест
quickSessionTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });