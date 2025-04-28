/**
 * Конфигурация скрапера для Otodom
 */

// Настройки ограничений ресурсов
export const RESOURCE_LIMITS = {
  // Ограничения памяти (в МБ)
  MEMORY: {
    WARNING_THRESHOLD: 350,   // Порог предупреждения
    CRITICAL_THRESHOLD: 400,  // Критический порог для перезапуска
    CHECK_INTERVAL: 30000     // Интервал проверки памяти (мс)
  },
  
  // Ограничения на сессию браузера
  BROWSER_SESSION: {
    MAX_PAGES_PER_SESSION: 10,     // Максимум страниц до перезапуска браузера
    MAX_SESSION_DURATION: 900000   // Максимальная длительность сессии (15 минут)
  }
};

// Настройки задержек
export const DELAYS = {
  // Задержки навигации
  NAVIGATION: {
    MIN_AFTER_PAGE_LOAD: 2000,   // Минимальная задержка после загрузки страницы
    MAX_AFTER_PAGE_LOAD: 5000,   // Максимальная задержка после загрузки страницы
    PAGE_LOAD_TIMEOUT: 60000     // Таймаут загрузки страницы
  },
  
  // Задержки между действиями
  ACTIONS: {
    MIN_BETWEEN_ACTIONS: 500,    // Минимальная задержка между действиями
    MAX_BETWEEN_ACTIONS: 2000,   // Максимальная задержка между действиями
    MIN_BETWEEN_PAGES: 3000,     // Минимальная задержка между страницами пагинации
    MAX_BETWEEN_PAGES: 8000      // Максимальная задержка между страницами пагинации
  },
  
  // Задержки повторных попыток
  RETRY: {
    MIN_DELAY: 5000,             // Минимальная задержка перед повтором
    MAX_DELAY: 15000,            // Максимальная задержка перед повтором
    EXPONENTIAL_FACTOR: 1.5      // Фактор экспоненциального роста задержек
  }
};

// Настройки повторных попыток
export const RETRY = {
  MAX_RETRIES: 3,                  // Максимальное количество повторных попыток
  BROWSER_RESTART_THRESHOLD: 2     // После какого числа ошибок перезапускать браузер
};

// Настройки скрапинга
export const SCRAPING = {
  MAX_PAGES_TOTAL: 20,             // Максимальное общее число страниц для обработки
  SAVE_INTERMEDIATE_RESULTS: true  // Сохранять промежуточные результаты
};

// Настройки антибот-защиты
export const ANTIBOT = {
  // Фразы для обнаружения антибот-защиты
  DETECTION_PHRASES: [
    'captcha', 'robot', 'blocked', 'suspicious', 
    'unusual activity', 'security check', 'verify'
  ],
  
  // Имитация поведения пользователя
  USER_BEHAVIOR: {
    RANDOM_SCROLLING: true,           // Случайная прокрутка страниц
    VISIT_RANDOM_LISTINGS: 0.1,       // Вероятность (10%) зайти на случайное объявление
    VARIABLE_TIMING: true             // Использовать переменные задержки между действиями
  }
};

// Пул User-Agent строк для ротации
export const USER_AGENTS = [
  // Десктопные User-Agent строки (Chrome)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  
  // Десктопные User-Agent строки (Firefox)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
  
  // Десктопные User-Agent строки (Safari)
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
  
  // Десктопные User-Agent строки (Edge)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Edge/121.0.0.0'
];

// Польские локации для установки геолокации
export const POLISH_LOCATIONS = [
  { longitude: 21.0118, latitude: 52.2298 }, // Варшава
  { longitude: 19.9449, latitude: 50.0647 }, // Краков
  { longitude: 17.0385, latitude: 51.1079 }, // Вроцлав
  { longitude: 18.6464, latitude: 54.3520 }  // Гданьск
];

// Настройки для получения конкретных типов комнат
export const ROOM_TYPE_QUERIES = {
  oneRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BONE%5D&by=DEFAULT&direction=DESC&viewType=listing",
  twoRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BTWO%5D&by=DEFAULT&direction=DESC&viewType=listing",
  threeRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BTHREE%5D&by=DEFAULT&direction=DESC&viewType=listing",
  fourPlusRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BFOUR%5D&by=DEFAULT&direction=DESC&viewType=listing"
};

// Функция для получения случайного User-Agent
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Функция для получения случайной польской локации
export function getRandomPolishLocation() {
  return POLISH_LOCATIONS[Math.floor(Math.random() * POLISH_LOCATIONS.length)];
}

// Функция для получения случайной задержки
export function getRandomDelay(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

// Опции запуска браузера с учетом ограничений ресурсов
export const BROWSER_LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--disable-accelerated-2d-canvas',
    '--disable-infobars',
    '--window-size=1366,768',
    '--single-process',
    '--no-zygote',
    '--disable-gpu-sandbox'
  ]
};