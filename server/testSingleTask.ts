// Тестовый скрипт для изолированного тестирования одиночной задачи скрапинга
import { scrapePropertyData } from './playwrightScraper';
import { TaskStatus } from './scrapeTaskManager';
import * as fs from 'fs';
import * as path from 'path';
import { format } from "date-fns";

// Конфигурация тестовой задачи
const testConfig = {
  city: 'warsaw',
  cityUrl: 'warszawa', 
  district: 'srodmiescie',
  districtName: 'Śródmieście',
  roomType: 'threeRoom',
};

async function runSingleTask() {
  console.log(`====== ISOLATED TEST TASK ======`);
  console.log(`Starting single isolated task for diagnostic`);
  console.log(`City: ${testConfig.city}, District: ${testConfig.district}, RoomType: ${testConfig.roomType}`);
  console.log(`===============================`);
  
  const fetchDate = format(new Date(), "dd.MM.yyyy");
  
  // Создаем тестовую задачу
  const testTask = {
    id: `test_${Date.now()}`,
    cityName: testConfig.city,
    cityUrl: testConfig.cityUrl,
    cityNormalized: testConfig.city,
    districtName: testConfig.districtName,
    districtSearchTerm: testConfig.district.toLowerCase(),
    roomType: testConfig.roomType,
    status: TaskStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 1,
    retryCount: 0,
    fetchDate
  };
  
  try {
    // Выполняем скрапинг напрямую
    const result = await scrapePropertyData(testTask);
    
    // Сохраняем результаты в специальный файл
    const filePath = path.join(process.cwd(), 'scraper_results', 'direct_test_task.json');
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
    
    // Проверяем, получили ли мы данные
    if (result && result.prices && result.prices.length > 0) {
      console.log(`Test task SUCCESS: ${result.prices.length} prices found`);
      console.log(`Average price: ${result.avgPrice} zł`);
      console.log(`Results saved to ${filePath}`);
    } else {
      // Задача выполнена, но данных нет
      console.warn(`Test task WARNING: Task completed but no prices found`);
      console.log(`cookieAccepted: ${result.diagnostics?.cookieAccepted}`);
      console.log(`Error: ${result.errorMessage || 'No error message'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error running isolated test task:", error);
    process.exit(1);
  }
}

// Запускаем тестовую задачу
runSingleTask().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});