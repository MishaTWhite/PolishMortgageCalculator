/**
 * Lightning Fast Extract
 * 
 * Самая быстрая возможная версия скрапера для тестирования извлечения данных.
 * Использует предварительно полученную HTML-страницу для мгновенного извлечения,
 * что полностью исключает использование браузера.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

// Константы
const SAMPLE_HTML_PATH = './test_sample.html';
const RESULTS_DIR = './scraper_results';

// Создаем директорию для результатов, если она не существует
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Извлекает данные из предварительно сохраненного файла HTML
 */
async function lightningFastExtract() {
  console.log('=== STARTING LIGHTNING FAST EXTRACT ===');
  
  const startTime = Date.now();
  
  try {
    // Проверяем, существует ли образец HTML-файла
    if (!fs.existsSync(SAMPLE_HTML_PATH)) {
      console.log('Sample HTML file not found. Creating a test file...');
      // Создаем тестовый файл HTML с минимальной структурой Otodom
      const sampleHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mieszkania 3 pokojowe na sprzedaż: Śródmieście, Warszawa | Otodom.pl</title>
        </head>
        <body>
          <div data-cy="search.listing-panel.label">Znaleziono 114 ogłoszeń</div>
          <article>
            <a href="https://www.otodom.pl/pl/oferta/3-pokojowe-mieszkanie-srodmiescie-ID4l92p">
              <h3 data-cy="listing-item-title">3-pokojowe mieszkanie, Śródmieście</h3>
              <span data-cy="listing-item-price">1 350 000 zł</span>
              <span data-cy="listing-item-area">75,5 m²</span>
              <p data-cy="listing-item-address">Warszawa, Śródmieście, ul. Przykładowa</p>
            </a>
          </article>
          <article>
            <a href="https://www.otodom.pl/pl/oferta/luksusowy-apartament-w-centrum-ID4lc7a">
              <h3 data-cy="listing-item-title">Luksusowy apartament w centrum</h3>
              <span data-cy="listing-item-price">1 750 000 zł</span>
              <span data-cy="listing-item-area">85 m²</span>
              <p data-cy="listing-item-address">Warszawa, Śródmieście, ul. Centralna</p>
            </a>
          </article>
        </body>
        </html>
      `;
      fs.writeFileSync(SAMPLE_HTML_PATH, sampleHtml);
      console.log('Test HTML file created successfully');
    }
    
    // Читаем HTML-файл
    console.log('Reading HTML file...');
    const htmlContent = fs.readFileSync(SAMPLE_HTML_PATH, 'utf-8');
    
    // Загружаем HTML в Cheerio для быстрого парсинга
    console.log('Parsing HTML with Cheerio...');
    const $ = cheerio.load(htmlContent);
    
    // Извлекаем информацию о количестве объявлений
    const countText = $('[data-cy="search.listing-panel.label"]').text().trim();
    const totalArticles = $('article').length;
    
    console.log(`Count text: ${countText}`);
    console.log(`Found ${totalArticles} article elements`);
    
    // Собираем данные из всех объявлений
    const listings = [];
    $('article').each((i, article) => {
      const $article = $(article);
      
      // Извлекаем данные
      const title = $article.find('[data-cy="listing-item-title"]').text().trim();
      const priceText = $article.find('[data-cy="listing-item-price"]').text().trim();
      const areaText = $article.find('[data-cy="listing-item-area"]').text().trim();
      const address = $article.find('[data-cy="listing-item-address"]').text().trim();
      const url = $article.find('a').attr('href');
      
      // Преобразуем текст в числа для расчетов
      const priceValue = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
      const areaValue = parseFloat(areaText.replace(/[^\d,.]/g, '').replace(',', '.')) || 0;
      
      // Рассчитываем цену за квадратный метр
      let pricePerSqm = 0;
      let pricePerSqmText = '';
      if (priceValue > 0 && areaValue > 0) {
        pricePerSqm = Math.round(priceValue / areaValue);
        pricePerSqmText = `${pricePerSqm} zł/m²`;
      }
      
      // Добавляем объявление в массив
      listings.push({
        title,
        price: {
          text: priceText,
          value: priceValue
        },
        area: {
          text: areaText,
          value: areaValue
        },
        pricePerSqm: {
          text: pricePerSqmText,
          value: pricePerSqm
        },
        address,
        url
      });
    });
    
    // Выводим информацию о найденных объявлениях
    console.log('\n=== EXTRACTED LISTINGS ===');
    console.log(`Total: ${listings.length} listings extracted`);
    
    // Показываем первое объявление в качестве примера
    if (listings.length > 0) {
      const example = listings[0];
      console.log('\nFirst listing example:');
      console.log(`Title: ${example.title}`);
      console.log(`Price: ${example.price.text} (${example.price.value})`);
      console.log(`Area: ${example.area.text} (${example.area.value})`);
      console.log(`Price per m²: ${example.pricePerSqm.text}`);
      console.log(`Address: ${example.address}`);
      console.log(`URL: ${example.url}`);
    }
    
    // Рассчитываем средние значения
    const prices = listings.map(item => item.price.value).filter(Boolean);
    const areas = listings.map(item => item.area.value).filter(Boolean);
    const pricesPerSqm = listings.map(item => item.pricePerSqm.value).filter(Boolean);
    
    const avgPrice = prices.length > 0 
      ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length) 
      : 0;
      
    const avgArea = areas.length > 0 
      ? Math.round(areas.reduce((sum, a) => sum + a, 0) / areas.length * 10) / 10 
      : 0;
      
    const avgPricePerSqm = pricesPerSqm.length > 0 
      ? Math.round(pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length) 
      : 0;
    
    // Выводим статистику
    console.log('\n=== STATISTICS ===');
    console.log(`Average price: ${avgPrice} PLN`);
    console.log(`Average area: ${avgArea} m²`);
    console.log(`Average price per m²: ${avgPricePerSqm} PLN/m²`);
    
    // Сохраняем результаты
    const resultsFile = path.join(RESULTS_DIR, `lightning_fast_extract_${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      url: 'https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa/srodmiescie?roomsNumber=%5BTHREE%5D',
      extractionTimeMs: Date.now() - startTime,
      totalArticles,
      countText,
      listings,
      statistics: {
        avgPrice,
        avgArea,
        avgPricePerSqm
      }
    }, null, 2));
    
    console.log(`\nResults saved to: ${resultsFile}`);
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    
    // Быстрое сохранение ошибки
    const errorFile = path.join(RESULTS_DIR, `lightning_fast_error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      extractionTimeMs: Date.now() - startTime
    }));
    
    console.log(`Error saved to: ${errorFile}`);
  } finally {
    const executionTime = Date.now() - startTime;
    console.log(`\nTotal execution time: ${executionTime}ms`);
    console.log('=== EXTRACTION COMPLETED ===');
  }
}

// Запускаем скрипт извлечения
lightningFastExtract()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });