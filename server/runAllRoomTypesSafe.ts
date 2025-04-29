/**
 * Run All Room Types Safe
 * 
 * Запускает безопасный скрапер для всех типов комнат (1, 2, 3, 4+) последовательно
 * Использует усовершенствованную версию скрапера, защищенную от ошибок
 */

import { runScraperSafe } from './summaryScraper';

const CITY = 'warszawa';
const DISTRICT = 'srodmiescie';

// Последовательное выполнение скраперов для каждого типа комнат
async function runAllRoomTypesSafe() {
  console.log('=== STARTING SCRAPING FOR ALL ROOM TYPES ===');
  
  try {
    // 1. Сначала однокомнатные квартиры
    console.log('\n=== STARTING ONE-ROOM APARTMENTS ===');
    await runScraperSafe(CITY, DISTRICT, 'oneRoom');
    
    // 2. Затем двухкомнатные
    console.log('\n=== STARTING TWO-ROOM APARTMENTS ===');
    await runScraperSafe(CITY, DISTRICT, 'twoRoom');
    
    // 3. Трехкомнатные
    console.log('\n=== STARTING THREE-ROOM APARTMENTS ===');
    await runScraperSafe(CITY, DISTRICT, 'threeRoom');
    
    // 4. Четыре и более комнат
    console.log('\n=== STARTING FOUR+ ROOM APARTMENTS ===');
    await runScraperSafe(CITY, DISTRICT, 'fourPlusRoom');
    
    console.log('\n=== ALL ROOM TYPES COMPLETED SUCCESSFULLY ===');
    return `All room types scraper completed for ${CITY}/${DISTRICT}`;
  } catch (error) {
    console.error(`Error running room types: ${(error as Error).message}`);
    return `Error running all room types: ${(error as Error).message}`;
  }
}

// Для запуска файла напрямую
if (process.argv[1] === __filename) {
  runAllRoomTypesSafe()
    .then((result) => {
      console.log(result);
      setTimeout(() => process.exit(0), 500);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

// Экспортируем функцию для использования в API
export { runAllRoomTypesSafe };