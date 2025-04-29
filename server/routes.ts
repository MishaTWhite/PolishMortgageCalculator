import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import http from 'http';
import { runScraper } from './searchSummaryScraper';

interface PropertyListing {
  district: string;
  roomType: string;
  price: number;
  area: number;
  pricePerSqm: number;
}

interface DistrictSummary {
  district: string;
  roomType: string;
  count: number;
  avgPricePerSqm: number;
  avgPrice: number;
  avgArea: number;
  timestamp: string;
}

const router = express.Router();
const RESULTS_DIR = './scraper_results';

// Функция для регистрации всех маршрутов
export async function registerRoutes(app: express.Express): Promise<http.Server> {
  app.use(router);
  return http.createServer(app);
}

// Маппинг типов комнат на человекочитаемые имена
const roomTypeNames: Record<string, string> = {
  'oneRoom': '1 комната',
  'twoRoom': '2 комнаты',
  'threeRoom': '3 комнаты',
  'fourPlusRoom': '4+ комнат'
};

// API для получения сводной статистики по районам и аналитики цен
router.get('/api/property-statistics', (req, res) => {
  try {
    const city = req.query.city as string || 'warszawa';
    
    // Получаем все JSON-файлы с результатами
    const summaries: DistrictSummary[] = [];
    const files = fs.readdirSync(RESULTS_DIR);
    
    // Фильтруем только JSON-файлы с результатами для указанного города
    const resultFiles = files.filter(file => 
      file.startsWith(city) && file.endsWith('.json') && !file.includes('error')
    );
    
    // Обрабатываем каждый файл
    resultFiles.forEach(file => {
      try {
        const filePath = path.join(RESULTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const listings = JSON.parse(content) as PropertyListing[];
        
        if (listings.length > 0) {
          // Извлекаем district и roomType из первого элемента
          const { district, roomType } = listings[0];
          
          // Рассчитываем средние значения
          const totalPricePerSqm = listings.reduce((sum, item) => sum + item.pricePerSqm, 0);
          const totalPrice = listings.reduce((sum, item) => sum + item.price, 0);
          const totalArea = listings.reduce((sum, item) => sum + item.area, 0);
          
          const avgPricePerSqm = Math.round(totalPricePerSqm / listings.length);
          const avgPrice = Math.round(totalPrice / listings.length);
          const avgArea = parseFloat((totalArea / listings.length).toFixed(1));
          
          // Извлекаем временную метку из имени файла
          const timestampMatch = file.match(/_(\d+)\.json$/);
          const timestamp = timestampMatch ? new Date(parseInt(timestampMatch[1])).toISOString() : new Date().toISOString();
          
          // Добавляем сводку в результаты
          summaries.push({
            district,
            roomType,
            count: listings.length,
            avgPricePerSqm,
            avgPrice,
            avgArea,
            timestamp
          });
        }
      } catch (e) {
        console.error(`Error processing file ${file}:`, e);
      }
    });
    
    // Сортируем по району и типу комнаты
    summaries.sort((a, b) => {
      if (a.district !== b.district) {
        return a.district.localeCompare(b.district);
      }
      // Сортировка по типу комнаты: oneRoom, twoRoom, threeRoom, fourPlusRoom
      const roomTypeOrder: Record<string, number> = {
        'oneRoom': 1,
        'twoRoom': 2,
        'threeRoom': 3,
        'fourPlusRoom': 4
      };
      return roomTypeOrder[a.roomType] - roomTypeOrder[b.roomType];
    });
    
    res.json({
      city,
      prices: summaries
    });
  } catch (error) {
    console.error('Error getting property statistics:', error);
    res.status(500).json({ error: 'Failed to get property statistics' });
  }
});

// API для получения сводной статистики по районам (устаревший, для обратной совместимости)
router.get('/api/property-prices', (req, res) => {
  try {
    const city = req.query.city as string || 'warszawa';
    
    // Получаем все JSON-файлы с результатами
    const summaries: DistrictSummary[] = [];
    const files = fs.readdirSync(RESULTS_DIR);
    
    // Фильтруем только JSON-файлы с результатами для указанного города
    const resultFiles = files.filter(file => 
      file.startsWith(city) && file.endsWith('.json') && !file.includes('error')
    );
    
    // Обрабатываем каждый файл
    resultFiles.forEach(file => {
      try {
        const filePath = path.join(RESULTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const listings = JSON.parse(content) as PropertyListing[];
        
        if (listings.length > 0) {
          // Извлекаем district и roomType из первого элемента
          const { district, roomType } = listings[0];
          
          // Рассчитываем средние значения
          const totalPricePerSqm = listings.reduce((sum, item) => sum + item.pricePerSqm, 0);
          const totalPrice = listings.reduce((sum, item) => sum + item.price, 0);
          const totalArea = listings.reduce((sum, item) => sum + item.area, 0);
          
          const avgPricePerSqm = Math.round(totalPricePerSqm / listings.length);
          const avgPrice = Math.round(totalPrice / listings.length);
          const avgArea = parseFloat((totalArea / listings.length).toFixed(1));
          
          // Извлекаем временную метку из имени файла
          const timestampMatch = file.match(/_(\d+)\.json$/);
          const timestamp = timestampMatch ? new Date(parseInt(timestampMatch[1])).toISOString() : new Date().toISOString();
          
          // Добавляем сводку в результаты
          summaries.push({
            district,
            roomType,
            count: listings.length,
            avgPricePerSqm,
            avgPrice,
            avgArea,
            timestamp
          });
        }
      } catch (e) {
        console.error(`Error processing file ${file}:`, e);
      }
    });
    
    // Сортируем по району и типу комнаты
    summaries.sort((a, b) => {
      if (a.district !== b.district) {
        return a.district.localeCompare(b.district);
      }
      // Сортировка по типу комнаты: oneRoom, twoRoom, threeRoom, fourPlusRoom
      const roomTypeOrder: Record<string, number> = {
        'oneRoom': 1,
        'twoRoom': 2,
        'threeRoom': 3,
        'fourPlusRoom': 4
      };
      return roomTypeOrder[a.roomType] - roomTypeOrder[b.roomType];
    });
    
    res.json({
      city,
      prices: summaries
    });
  } catch (error) {
    console.error('Error getting property prices:', error);
    res.status(500).json({ error: 'Failed to get property prices' });
  }
});

// API для запуска скрапера из интерфейса статистики
router.post('/api/scrape-property-data', async (req, res) => {
  try {
    const city = req.body.city || 'warszawa';
    const district = req.body.district || 'srodmiescie';
    
    // Импортируем функцию запуска скрапера для всех типов комнат
    const { runAllRoomTypes } = await import('./runAllRoomTypes');
    
    // Запускаем асинхронно
    runAllRoomTypes()
      .then(() => {
        console.log(`All room types scraper completed for ${city}/${district}`);
      })
      .catch(err => {
        console.error(`Error in all room types scraper for ${city}/${district}:`, err);
      });
    
    // Сразу возвращаем ответ
    res.json({
      status: 'started',
      message: `Scraper started for all room types in ${city}/${district}`
    });
  } catch (error) {
    console.error('Error starting property data scraper:', error);
    res.status(500).json({ error: 'Failed to start property data scraper' });
  }
});

// API для запуска скрапера для конкретного района и типа комнат
router.post('/api/start-scraper', async (req, res) => {
  try {
    const { city, district, roomType } = req.body;
    
    if (!city || !district || !roomType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Запускаем скрапер асинхронно
    runScraper(city, district, roomType)
      .then(() => {
        console.log(`Scraper completed for ${city}/${district}/${roomType}`);
      })
      .catch(err => {
        console.error(`Scraper error for ${city}/${district}/${roomType}:`, err);
      });
    
    // Сразу возвращаем ответ, не дожидаясь завершения скрапера
    res.json({
      status: 'started',
      message: `Scraper started for ${city}/${district}/${roomType}`
    });
  } catch (error) {
    console.error('Error starting scraper:', error);
    res.status(500).json({ error: 'Failed to start scraper' });
  }
});

// API для запуска скрапера для всех типов комнат
router.post('/api/start-all-room-types', async (req, res) => {
  try {
    const { city, district } = req.body;
    
    if (!city || !district) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Запускаем скраперы для всех типов комнат асинхронно
    const roomTypes = ['oneRoom', 'twoRoom', 'threeRoom', 'fourPlusRoom'];
    
    Promise.all(roomTypes.map(roomType => runScraper(city, district, roomType)))
      .then(() => {
        console.log(`All scrapers completed for ${city}/${district}`);
      })
      .catch(err => {
        console.error(`Error in scrapers for ${city}/${district}:`, err);
      });
    
    // Сразу возвращаем ответ
    res.json({
      status: 'started',
      message: `Scrapers started for all room types in ${city}/${district}`
    });
  } catch (error) {
    console.error('Error starting scrapers:', error);
    res.status(500).json({ error: 'Failed to start scrapers' });
  }
});

// Мок API для обменного курса (PLN к USD и EUR)
router.get('/api/exchange-rates', (req, res) => {
  res.json({
    source: 'NBP',
    base: 'PLN',
    rates: {
      USD: 0.254,
      EUR: 0.234,
      UAH: 9.87
    },
    fetchDate: new Date().toISOString()
  });
});

// Мок API для процентной ставки по ипотеке
router.get('/api/interest-rate', (req, res) => {
  res.json({
    source: 'NBP',
    rate: 5.75,
    fetchDate: new Date().toISOString()
  });
});

// Мок API для ставок WIBOR
router.get('/api/wibor-rates', (req, res) => {
  res.json({
    source: 'GPW Benchmark',
    rates: {
      '1M': 5.86,
      '3M': 5.87,
      '6M': 5.85,
      '1Y': 5.82
    },
    fetchDate: new Date().toISOString()
  });
});

// Мок API для предложений банков
router.get('/api/bank-offers', (req, res) => {
  res.json({
    source: 'Market research',
    offers: [
      {
        bank: 'PKO Bank Polski',
        rate: 'WIBOR 3M + 1.99%',
        maxLTV: 90,
        maxYears: 35
      },
      {
        bank: 'mBank',
        rate: 'WIBOR 3M + 2.09%',
        maxLTV: 90,
        maxYears: 35
      },
      {
        bank: 'Santander',
        rate: 'WIBOR 3M + 2.19%',
        maxLTV: 90,
        maxYears: 30
      },
      {
        bank: 'ING Bank Śląski',
        rate: 'WIBOR 3M + 1.85%',
        maxLTV: 80,
        maxYears: 35
      }
    ],
    fetchDate: new Date().toISOString()
  });
});

// API для расчета ипотеки
router.post('/api/calculate-mortgage', (req, res) => {
  try {
    const { amount, years, interestRate } = req.body;
    
    // Расчет ежемесячной выплаты по формуле аннуитета
    const r = interestRate / 100 / 12; // месячная процентная ставка
    const n = years * 12; // общее количество платежей
    
    const monthlyPayment = amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - amount;
    
    res.json({
      loanAmount: amount,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating mortgage:', error);
    res.status(500).json({ error: 'Failed to calculate mortgage' });
  }
});

export default router;