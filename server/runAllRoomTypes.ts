/**
 * Run All Room Types
 * 
 * Запускает скрапер для всех типов комнат (1, 2, 3, 4+) последовательно
 * Это позволяет избежать перегрузки и выполнить все запросы в ограниченных ресурсах Replit
 */

import { runScraper } from './searchSummaryScraper';

const CITY = 'warszawa';
const DISTRICT = 'srodmiescie';

// Последовательное выполнение скраперов для каждого типа комнат
async function runAllRoomTypes() {
  console.log('=== STARTING SCRAPING FOR ALL ROOM TYPES ===');
  
  try {
    // 1. Сначала однокомнатные квартиры
    console.log('\n=== STARTING ONE-ROOM APARTMENTS ===');
    await runScraper(CITY, DISTRICT, 'oneRoom');
    
    // 2. Затем двухкомнатные
    console.log('\n=== STARTING TWO-ROOM APARTMENTS ===');
    await runScraper(CITY, DISTRICT, 'twoRoom');
    
    // 3. Трехкомнатные
    console.log('\n=== STARTING THREE-ROOM APARTMENTS ===');
    await runScraper(CITY, DISTRICT, 'threeRoom');
    
    // 4. Четыре и более комнат
    console.log('\n=== STARTING FOUR+ ROOM APARTMENTS ===');
    await runScraper(CITY, DISTRICT, 'fourPlusRoom');
    
    console.log('\n=== ALL ROOM TYPES COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error(`Error running room types: ${(error as Error).message}`);
  }
}

// Для запуска файла напрямую
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  runAllRoomTypes()
    .then(() => {
      console.log('Scraping completed for all room types.');
      setTimeout(() => process.exit(0), 100);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

// Экспортируем функцию для использования в API
export { runAllRoomTypes };