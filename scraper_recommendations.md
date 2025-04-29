# Otodom Scraper: Рекомендации по итогам исследования

## Ключевые достижения

1. **Успешный обход CloudFront защиты** с использованием техники "session hijacking" (заимствования реальной пользовательской сессии)
2. **Работающая загрузка страниц результатов поиска** с различными параметрами (район, количество комнат)
3. **Успешное извлечение метаданных страницы** (заголовок, статус ответа)
4. **Определение неблокируемой конфигурации браузера**, позволяющей проходить проверки антибот-систем

## Оптимальная конфигурация

Для успешного скрапинга Otodom необходимо:

1. **Использовать cookies и localStorage из реальной пользовательской сессии**
   - Сохранять эти данные в файл и обновлять их примерно раз в 1-2 недели или при обнаружении блокировок
   - Включать все необходимые куки, связанные с авторизацией и сессией

2. **Использовать расширенные настройки браузера**:
   ```typescript
   const browser = await chromium.launch({
     headless: true,
     executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
     args: [
       '--no-sandbox',
       '--disable-setuid-sandbox',
       '--disable-blink-features=AutomationControlled',
       '--disable-features=IsolateOrigins,site-per-process',
       '--disable-web-security',
       '--disable-dev-shm-usage',
       '--window-size=1366,768'
     ],
     ignoreDefaultArgs: ['--enable-automation']
   });
   ```

3. **Создавать контекст с реалистичными параметрами польского пользователя**:
   ```typescript
   const context = await browser.newContext({
     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
     locale: 'pl-PL',
     timezoneId: 'Europe/Warsaw',
     geolocation: { longitude: 21.0122, latitude: 52.2297 },
     viewport: { width: 1366, height: 768 },
     extraHTTPHeaders: {
       'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
       'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
       'sec-ch-ua-mobile': '?0',
       'sec-ch-ua-platform': '"Windows"'
     }
   });
   ```

4. **Устанавливать localStorage как до, так и после навигации**:
   ```typescript
   // До навигации
   await page.addInitScript(`() => {
     const storage = ${JSON.stringify(localStorage)};
     for (const [key, value] of Object.entries(storage)) {
       if (value) localStorage.setItem(key, value);
     }
   }`);
   
   // После навигации
   await page.evaluate((storageItems) => {
     for (const [key, value] of Object.entries(storageItems)) {
       if (value !== null) {
         localStorage.setItem(key, value);
       }
     }
   }, localStorage);
   ```

5. **Добавлять скрипты для подмены свойств navigator и других объектов**:
   ```typescript
   await page.addInitScript(() => {
     // Webdriver
     Object.defineProperty(navigator, 'webdriver', { get: () => false });
     
     // Plugins и languages
     Object.defineProperty(navigator, 'plugins', { 
       get: () => [...реалистичные плагины...] 
     });
     
     Object.defineProperty(navigator, 'languages', { 
       get: () => ['pl-PL', 'pl', 'en-US', 'en'] 
     });
     
     // Другие свойства для антидетекта
     window.chrome = { ... };
   });
   ```

## Структура работающего скрапера

Оптимальная структура скрапера должна включать:

1. **Модуль управления сессиями** - загрузка/сохранение cookies и localStorage
2. **Модуль подготовки браузера** - конфигурация с антидетект-настройками
3. **Модуль выполнения задач** - с обработкой ошибок, повторными попытками и таймаутами
4. **Модуль извлечения данных** - парсинг результатов после успешной загрузки страницы
5. **Модуль диагностики** - для мониторинга работы скрапера и обнаружения блокировок

## Извлечение данных

После успешной загрузки страницы следует использовать следующие селекторы для извлечения данных о недвижимости:

```typescript
// Объявления
const articles = document.querySelectorAll('article');

// Счетчик объявлений
const countElement = document.querySelector('[data-cy="search.listing-panel.label"]');

// Цены (несколько вариантов селекторов)
const priceSelectors = [
  '[data-cy="listing-item-price"]',
  '.css-s8lxhp',
  '.e1jyrtvq0',
  'article .css-1mojcj4 span'
];

// Площади
const areaSelectors = [
  '[data-cy="listing-item-area"]',
  'article span[aria-label*="area"]',
  'article span[aria-label*="powierzchnia"]'
];
```

## Рекомендации по оптимизации выполнения

1. **Ограничения платформы Replit**:
   - Использовать таймауты для всех операций (макс. 15-20 секунд)
   - Принудительно закрывать ресурсы браузера после выполнения
   - Ограничивать количество запускаемых браузеров

2. **Обработка ошибок**:
   - Реализовать механизм повторных попыток с экспоненциальной задержкой
   - Использовать временные метки для отслеживания зависших задач

3. **Масштабирование**:
   - Распределять выполнение задач во времени (избегать одновременного выполнения многих задач)
   - Использовать очередь задач с контролем одновременного выполнения

## Мониторинг успешности

Для мониторинга успешности скрапинга следует отслеживать:

1. **Статус ответа** - 200 указывает на успешную загрузку
2. **Заголовок страницы** - должен соответствовать ожидаемому формату
3. **Наличие элементов объявлений** - количество найденных `article` элементов
4. **Признаки блокировки** - сообщения от CloudFront в HTML

## Выводы по исследованию

1. **Ключевой фактор успеха** - использование реальной пользовательской сессии
2. **Главное препятствие** - защита CloudFront и техники обнаружения автоматизации
3. **Стабильность решения** - требуется периодическое обновление данных сессии
4. **Производительность в Replit** - ограничена ресурсами платформы

---

Данные рекомендации основаны на серии успешных тестов, проведенных в рамках исследования возможностей скрапинга Otodom. Реализация указанных подходов позволит создать стабильно работающий скрапер с высоким процентом успешных задач.