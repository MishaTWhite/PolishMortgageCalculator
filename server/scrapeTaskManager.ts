/**
 * Менеджер задач скрапинга с поддержкой восстановления
 */
import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logError, logWarning, logDebug } from './scraperLogger';

// Директория для хранения задач и состояния
const TASKS_DIR = path.join(process.cwd(), 'scraper_tasks');

// Создаем директорию, если не существует
if (!fs.existsSync(TASKS_DIR)) {
  try {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  } catch (err) {
    console.error(`Failed to create tasks directory: ${err}`);
  }
}

// Файлы состояния
const QUEUE_FILE = path.join(TASKS_DIR, 'queue.json');
const CURRENT_TASK_FILE = path.join(TASKS_DIR, 'current_task.json');
const COMPLETED_TASKS_FILE = path.join(TASKS_DIR, 'completed_tasks.json');

// Импортируем типы ошибок
import { TaskStatus, ErrorType, ScrapeResult, DiagnosticInfo, determineErrorType, isRetriable, getErrorDescription, getErrorDescriptionEn } from './scraperTypes';

// Реэкспортируем TaskStatus для других модулей
export { TaskStatus };

// Интерфейс задачи скрапинга
export interface ScrapeTask {
  id: string;                    // Уникальный идентификатор задачи
  cityUrl: string;               // URL-сегмент города для Otodom
  cityNormalized: string;        // Нормализованное название города
  districtName: string;          // Название района
  districtSearchTerm: string;    // Поисковый термин района для URL
  roomType: string;              // Тип комнаты (oneRoom, twoRoom, etc.)
  priority: number;              // Приоритет задачи (меньшее значение = выше приоритет)
  fetchDate: string;             // Дата сбора данных
  retryCount: number;            // Счетчик повторных попыток
  status: TaskStatus;            // Статус задачи
  createdAt: string;             // Дата и время создания задачи
  updatedAt: string;             // Дата и время последнего обновления
  startedAt?: string;            // Дата и время начала выполнения (если есть)
  completedAt?: string;          // Дата и время завершения (если есть)
  error?: string;                // Ошибка, если задача завершилась с ошибкой
  errorType?: ErrorType;         // Тип ошибки для более точной классификации
  result?: any;                  // Результаты выполнения задачи (если есть)
}

// Используем TaskStatus из scraperTypes.ts

// Состояние очереди задач
interface TaskQueueState {
  isProcessing: boolean;         // Флаг обработки
  lastError?: string;            // Последняя ошибка (если есть)
  lastTaskId?: string;           // ID последней выполненной задачи
  totalTasks: number;            // Общее число задач (включая выполненные)
  pendingTasks: number;          // Число задач в очереди
  completedTasks: number;        // Число успешно выполненных задач
  failedTasks: number;           // Число неудачно выполненных задач
  startTime?: string;            // Время запуска обработки очереди
  updatedAt: string;             // Время последнего обновления
}

// Очередь задач и состояние
let taskQueue: ScrapeTask[] = [];
let completedTasks: ScrapeTask[] = [];
let currentTask: ScrapeTask | null = null;
let isProcessing = false;
let taskProcessor: ((task: ScrapeTask) => Promise<any>) | null = null;

// Статистика выполнения для отслеживания прогресса
interface ScrapingStatistics {
  total: number;
  completed: number;
  failed: number;
  retried: number;
  inProgress: number;
  pending: number;
  successRate: number;
  withData: number; // задачи, где prices.length > 0
  withDataRate: number;
  startTime: string;
  endTime: string | null;
  runtime: number; // миллисекунды
  errorsByType: Record<ErrorType, number>; // статистика по типам ошибок
}

// Инициализация статистики
const scrapingStats: ScrapingStatistics = {
  total: 0,
  completed: 0,
  failed: 0,
  retried: 0,
  inProgress: 0,
  pending: 0,
  successRate: 0,
  withData: 0,
  withDataRate: 0,
  startTime: new Date().toISOString(),
  endTime: null,
  runtime: 0,
  errorsByType: Object.values(ErrorType).reduce((acc, type) => {
    if (typeof type === 'string') {
      acc[type as ErrorType] = 0;
    }
    return acc;
  }, {} as Record<ErrorType, number>)
};

/**
 * Сохраняет очередь задач в файл
 */
function saveQueue(): void {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(taskQueue), 'utf8');
    logDebug(`Saved ${taskQueue.length} tasks to queue file`);
  } catch (err) {
    logError(`Failed to save queue: ${err}`);
  }
}

/**
 * Сохраняет текущую задачу в файл
 */
function saveCurrentTask(): void {
  try {
    fs.writeFileSync(CURRENT_TASK_FILE, JSON.stringify(currentTask), 'utf8');
    logDebug(`Saved current task to file`);
  } catch (err) {
    logError(`Failed to save current task: ${err}`);
  }
}

/**
 * Сохраняет выполненные задачи в файл
 */
function saveCompletedTasks(): void {
  try {
    fs.writeFileSync(COMPLETED_TASKS_FILE, JSON.stringify(completedTasks), 'utf8');
    logDebug(`Saved ${completedTasks.length} completed tasks to file`);
  } catch (err) {
    logError(`Failed to save completed tasks: ${err}`);
  }
}

/**
 * Загружает очередь задач из файла
 */
function loadQueue(): void {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const data = fs.readFileSync(QUEUE_FILE, 'utf8');
      taskQueue = JSON.parse(data);
      logInfo(`Loaded ${taskQueue.length} tasks from queue file`);
    }
  } catch (err) {
    logError(`Failed to load queue: ${err}`);
    taskQueue = [];
  }
}

/**
 * Загружает текущую задачу из файла
 */
function loadCurrentTask(): void {
  try {
    if (fs.existsSync(CURRENT_TASK_FILE)) {
      const data = fs.readFileSync(CURRENT_TASK_FILE, 'utf8');
      currentTask = JSON.parse(data);
      if (currentTask) {
        logInfo(`Loaded current task ${currentTask.id} from file`);
      }
    }
  } catch (err) {
    logError(`Failed to load current task: ${err}`);
    currentTask = null;
  }
}

/**
 * Загружает выполненные задачи из файла
 */
function loadCompletedTasks(): void {
  try {
    if (fs.existsSync(COMPLETED_TASKS_FILE)) {
      const data = fs.readFileSync(COMPLETED_TASKS_FILE, 'utf8');
      completedTasks = JSON.parse(data);
      logInfo(`Loaded ${completedTasks.length} completed tasks from file`);
    }
  } catch (err) {
    logError(`Failed to load completed tasks: ${err}`);
    completedTasks = [];
  }
}

/**
 * Генерирует уникальный ID для задачи
 */
function generateTaskId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

/**
 * Создает новую задачу
 */
function createTask(
  cityUrl: string,
  cityNormalized: string,
  districtName: string,
  districtSearchTerm: string,
  roomType: string,
  priority: number,
  fetchDate: string
): ScrapeTask {
  const now = new Date().toISOString();
  
  return {
    id: generateTaskId(),
    cityUrl,
    cityNormalized,
    districtName,
    districtSearchTerm,
    roomType,
    priority,
    fetchDate,
    retryCount: 0,
    status: TaskStatus.PENDING,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Добавляет задачу в очередь
 */
export function enqueueTask(task: Partial<ScrapeTask>): ScrapeTask {
  // Проверка обязательных полей
  if (!task.cityUrl || !task.cityNormalized || !task.districtName || 
      !task.districtSearchTerm || !task.roomType || !task.fetchDate) {
    throw new Error('Missing required task fields');
  }
  
  // Создаем полную задачу с заданными полями
  const fullTask: ScrapeTask = {
    ...createTask(
      task.cityUrl,
      task.cityNormalized,
      task.districtName,
      task.districtSearchTerm,
      task.roomType,
      task.priority || 0,
      task.fetchDate
    ),
    ...task,
    id: task.id || generateTaskId() // Используем существующий ID или генерируем новый
  };
  
  // Добавляем в очередь
  taskQueue.push(fullTask);
  logInfo(`Added task ${fullTask.id} to queue: ${fullTask.cityNormalized}/${fullTask.districtSearchTerm}/${fullTask.roomType}`);
  
  // Сохраняем очередь
  saveQueue();
  
  // Если обработчик задач зарегистрирован и обработка не запущена, запускаем
  if (taskProcessor && !isProcessing) {
    processNextTask();
  }
  
  return fullTask;
}

/**
 * Добавляет множество задач для города
 */
export function enqueueCityTasks(
  cityUrl: string,
  cityNormalized: string,
  districts: Array<{name: string, searchTerm: string}>,
  roomTypes: string[],
  fetchDate: string
): ScrapeTask[] {
  logInfo(`Adding tasks for city ${cityNormalized} (${districts.length} districts, ${roomTypes.length} room types)`);
  
  const tasks: ScrapeTask[] = [];
  let priority = 0;
  
  // Создаем задачи для каждой комбинации район + тип комнаты
  for (const district of districts) {
    for (const roomType of roomTypes) {
      const task = enqueueTask({
        cityUrl,
        cityNormalized,
        districtName: district.name,
        districtSearchTerm: district.searchTerm,
        roomType,
        priority: priority++,
        fetchDate
      });
      
      tasks.push(task);
    }
  }
  
  // Сортируем очередь по приоритету
  taskQueue.sort((a, b) => a.priority - b.priority);
  saveQueue();
  
  logInfo(`Added ${tasks.length} tasks total for city ${cityNormalized}`);
  
  return tasks;
}

/**
 * Рассчитывает время задержки между повторными попытками
 * с использованием экспоненциальной стратегии
 */
export function getRetryDelay(retryCount: number, errorType: ErrorType): number {
  // Базовая задержка (в миллисекундах)
  const BASE_DELAY = 3000; // 3 секунды
  
  // Множитель для экспоненциального роста задержки
  const BACKOFF_FACTOR = 3;
  
  // Максимальная задержка (1.5 минуты)
  const MAX_DELAY = 90000;
  
  // Базовый множитель зависит от типа ошибки
  let errorFactor = 1;
  
  switch (errorType) {
    case ErrorType.BOT_DETECTED:
      // Для обнаружения бота требуется больше времени
      errorFactor = 5;
      break;
    case ErrorType.MEMORY_LIMIT_EXCEEDED:
      // При нехватке памяти нужно дать системе время на очистку ресурсов
      errorFactor = 3;
      break;
    case ErrorType.CONNECTION_ERROR:
      // Сетевые ошибки могут требовать больше времени для восстановления
      errorFactor = 2;
      break;
    case ErrorType.BROWSER_CRASHED:
    case ErrorType.BROWSER_CONTEXT_CLOSED:
      // Восстановление после падения браузера
      errorFactor = 4;
      break;
    default:
      errorFactor = 1;
  }
  
  // Рассчитываем задержку по формуле: BASE_DELAY * (BACKOFF_FACTOR ^ retryCount) * errorFactor
  const delay = BASE_DELAY * Math.pow(BACKOFF_FACTOR, retryCount) * errorFactor;
  
  // Ограничиваем максимальной задержкой
  return Math.min(delay, MAX_DELAY);
}

/**
 * Обновляет статус задачи
 */
export function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  result?: any,
  error?: string,
  errorType?: ErrorType
): void {
  // Сначала ищем в текущей задаче
  if (currentTask && currentTask.id === taskId) {
    currentTask.status = status;
    currentTask.updatedAt = new Date().toISOString();
    
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      currentTask.completedAt = new Date().toISOString();
    }
    
    if (result) {
      currentTask.result = result;
    }
    
    if (error) {
      currentTask.error = error;
    }
    
    if (errorType) {
      currentTask.errorType = errorType;
    }
    
    saveCurrentTask();
    return;
  }
  
  // Затем в очереди
  const taskIndex = taskQueue.findIndex(t => t.id === taskId);
  if (taskIndex >= 0) {
    taskQueue[taskIndex].status = status;
    taskQueue[taskIndex].updatedAt = new Date().toISOString();
    
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      taskQueue[taskIndex].completedAt = new Date().toISOString();
    }
    
    if (result) {
      taskQueue[taskIndex].result = result;
    }
    
    if (error) {
      taskQueue[taskIndex].error = error;
    }
    
    if (errorType) {
      taskQueue[taskIndex].errorType = errorType;
    }
    
    saveQueue();
    return;
  }
  
  // Наконец, в выполненных задачах
  const completedIndex = completedTasks.findIndex(t => t.id === taskId);
  if (completedIndex >= 0) {
    completedTasks[completedIndex].status = status;
    completedTasks[completedIndex].updatedAt = new Date().toISOString();
    
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      completedTasks[completedIndex].completedAt = new Date().toISOString();
    }
    
    if (result) {
      completedTasks[completedIndex].result = result;
    }
    
    if (error) {
      completedTasks[completedIndex].error = error;
    }
    
    if (errorType) {
      completedTasks[completedIndex].errorType = errorType;
    }
    
    saveCompletedTasks();
    return;
  }
  
  logWarning(`Failed to update task ${taskId}: task not found`);
}

/**
 * Перемещает задачу из очереди в выполненные
 */
function moveTaskToCompleted(task: ScrapeTask): void {
  // Удаляем из очереди, если есть
  const taskIndex = taskQueue.findIndex(t => t.id === task.id);
  if (taskIndex >= 0) {
    taskQueue.splice(taskIndex, 1);
    saveQueue();
  }
  
  // Добавляем в выполненные
  completedTasks.push(task);
  saveCompletedTasks();
  
  // Если это текущая задача, обнуляем
  if (currentTask && currentTask.id === task.id) {
    currentTask = null;
    saveCurrentTask();
  }
}

/**
 * Обрабатывает следующую задачу из очереди
 */
async function processNextTask(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  
  // Локальная переменная для текущей задачи
  let localTask: ScrapeTask | null = null;
  
  try {
    // Если очередь пуста, выходим
    if (taskQueue.length === 0) {
      logInfo('Task queue is empty, nothing to process');
      isProcessing = false;
      return;
    }
    
    // Получаем задачу с наивысшим приоритетом
    const task = taskQueue.shift();
    if (!task) {
      logWarning("Shifted task from queue is null or undefined");
      isProcessing = false;
      return;
    }
    
    // Сохраняем задачу как в глобальную, так и в локальную переменную
    localTask = task;
    currentTask = task;
    
    // Обновляем статус задачи
    task.status = TaskStatus.IN_PROGRESS;
    task.startedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    // Сохраняем состояние
    saveCurrentTask();
    saveQueue();
    
    logInfo(`Processing task ${task.id}: ${task.cityNormalized}/${task.districtName}/${task.roomType}`);
    
    // Проверяем, что обработчик задач зарегистрирован
    if (!taskProcessor) {
      throw new Error("Task processor is not registered");
    }
    
    // Выполняем задачу
    const result = await taskProcessor(task);
    
    // Обновляем статус задачи
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    task.result = result;
    
    // Перемещаем в выполненные
    moveTaskToCompleted(task);
    
    logInfo(`Task ${task.id} completed successfully`);
  } catch (error: any) {
    // Используем локальную переменную, так как currentTask может быть null
    // если задачу не удалось получить из очереди или ее сбросили в другом потоке
    const taskForError = localTask || currentTask;
    
    if (!taskForError) {
      logError(`Error processing task but no task reference available: ${error}`);
      isProcessing = false;
      return;
    }
    
    // Используем типизацию ошибок для более точной обработки
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = determineErrorType(error);
    const retriable = isRetriable(errorType);
    const errorDesc = getErrorDescription(errorType);
    
    logError(`Error processing task ${taskForError.id}: ${errorMessage} [Type: ${errorType}, Retriable: ${retriable}]`);
    
    // Добавляем дополнительную диагностику в результаты
    const errorResult = {
      errorType,
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      retriable,
      botDetected: errorType === ErrorType.BOT_DETECTED,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Если достигнуто максимальное число повторов или ошибка не retriable, помечаем как неудачную
      if (taskForError.retryCount >= 3 || !retriable) {
        taskForError.status = TaskStatus.FAILED;
        taskForError.completedAt = new Date().toISOString();
        taskForError.updatedAt = new Date().toISOString();
        taskForError.error = `${errorDesc}: ${errorMessage}`;
        taskForError.errorType = errorType;
        taskForError.result = {
          ...taskForError.result,
          ...errorResult,
          diagnostic: `Причина: ${errorDesc}. Повторные попытки: ${taskForError.retryCount}/3`
        };
        
        // Перемещаем в выполненные
        moveTaskToCompleted(taskForError);
        
        // Логируем финальный сбой с причиной
        logError(`Task ${taskForError.id} failed after ${taskForError.retryCount} attempts: ${errorDesc}`);
      } else {
        // Иначе помечаем для повторного выполнения, если ошибка retriable
        taskForError.status = TaskStatus.RETRY;
        taskForError.retryCount++;
        taskForError.updatedAt = new Date().toISOString();
        taskForError.error = `${errorDesc}: ${errorMessage}`;
        taskForError.errorType = errorType;
        
        // Логируем информацию о повторной попытке
        logInfo(`Task ${taskForError.id} will be retried (${taskForError.retryCount}/3): ${errorDesc}`);
        
        // Добавляем в очередь
        const taskIndex = taskQueue.findIndex(t => t && t.id === taskForError.id);
        if (taskIndex >= 0) {
          taskQueue.splice(taskIndex, 1);
        }
        
        // Добавляем с повышенным приоритетом (но не в самое начало)
        taskQueue.splice(Math.min(taskQueue.length, 5), 0, taskForError);
      }
    } catch (innerError) {
      logError(`Error handling task failure: ${innerError}`);
    }
    
    // Сбрасываем переменные
    currentTask = null;
    saveCurrentTask();
    saveQueue();
  } finally {
    // Сбрасываем флаг обработки
    isProcessing = false;
    
    // Обновляем статистику после каждой задачи
    updateScrapingStatistics();
    
    // Если в очереди остались задачи, продолжаем обработку
    if (taskQueue.length > 0) {
      // Небольшая задержка между задачами
      setTimeout(processNextTask, 1000);
    } else {
      // Задачи закончились, выводим итоговую статистику
      scrapingStats.endTime = new Date().toISOString();
      logInfo('Task queue processing completed');
      printScrapingStatistics();
      
      // Сохраняем статистику в файл для последующего анализа
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      saveScrapingStatistics(`scraping_stats_${timestamp}.json`);
    }
  }
}

/**
 * Регистрирует обработчик задач
 */
export function registerTaskProcessor(processor: (task: ScrapeTask) => Promise<any>): void {
  taskProcessor = processor;
  logInfo('Task processor registered');
  
  // Если есть задачи в очереди, запускаем обработку
  if (taskQueue.length > 0 && !isProcessing) {
    processNextTask();
  }
}

/**
 * Очищает очередь задач
 */
export function clearTaskQueue(): void {
  const tasksCount = taskQueue.length;
  taskQueue = [];
  saveQueue();
  logInfo(`Task queue cleared (${tasksCount} tasks removed)`);
}

/**
 * Возвращает статус очереди задач
 */
export function getQueueStatus(): TaskQueueState {
  const now = new Date().toISOString();
  
  return {
    isProcessing,
    totalTasks: taskQueue.length + completedTasks.length,
    pendingTasks: taskQueue.length,
    completedTasks: completedTasks.length,
    failedTasks: completedTasks.filter(t => t.status === TaskStatus.FAILED).length,
    lastTaskId: currentTask?.id,
    updatedAt: now
  };
}

/**
 * Возвращает список задач в очереди
 */
export function getPendingTasks(): ScrapeTask[] {
  return [...taskQueue];
}

/**
 * Возвращает список выполненных задач
 */
export function getCompletedTasks(): ScrapeTask[] {
  return [...completedTasks];
}

/**
 * Возвращает текущую задачу
 */
export function getCurrentTask(): ScrapeTask | null {
  return currentTask;
}

/**
 * Обновляет статистику выполнения задач
 */
function updateScrapingStatistics(): void {
  // Считаем количество задач по статусам
  scrapingStats.total = taskQueue.length + completedTasks.length + (currentTask ? 1 : 0);
  scrapingStats.pending = taskQueue.filter(t => t.status === TaskStatus.PENDING).length;
  scrapingStats.inProgress = currentTask && currentTask.status === TaskStatus.IN_PROGRESS ? 1 : 0;
  scrapingStats.retried = taskQueue.filter(t => t.status === TaskStatus.RETRY).length;
  
  // Анализируем завершенные задачи
  scrapingStats.completed = completedTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  scrapingStats.failed = completedTasks.filter(t => t.status === TaskStatus.FAILED).length;
  
  // Считаем задачи с данными (prices.length > 0)
  scrapingStats.withData = completedTasks.filter(t => {
    return t.result && t.result.prices && Array.isArray(t.result.prices) && t.result.prices.length > 0;
  }).length;
  
  // Считаем процент успеха
  if (scrapingStats.completed + scrapingStats.failed > 0) {
    scrapingStats.successRate = Math.round((scrapingStats.completed / (scrapingStats.completed + scrapingStats.failed)) * 100);
    scrapingStats.withDataRate = Math.round((scrapingStats.withData / (scrapingStats.completed + scrapingStats.failed)) * 100);
  }
  
  // Обновляем время работы
  const startTime = new Date(scrapingStats.startTime).getTime();
  scrapingStats.runtime = Date.now() - startTime;
  
  // Анализируем типы ошибок
  // Сначала сбрасываем счетчики
  Object.keys(scrapingStats.errorsByType).forEach(key => {
    scrapingStats.errorsByType[key as ErrorType] = 0;
  });

  // Затем считаем ошибки для каждого типа
  completedTasks.forEach(task => {
    if (task.status === TaskStatus.FAILED && task.errorType) {
      if (Object.values(ErrorType).includes(task.errorType)) {
        scrapingStats.errorsByType[task.errorType] = (scrapingStats.errorsByType[task.errorType] || 0) + 1;
      }
    }
  });
}

/**
 * Выводит статистику выполнения
 */
export function printScrapingStatistics(): void {
  updateScrapingStatistics();
  
  // Форматируем время выполнения
  const runtimeMinutes = Math.floor(scrapingStats.runtime / 60000);
  const runtimeSeconds = Math.floor((scrapingStats.runtime % 60000) / 1000);
  
  // Выводим сводку по статусам задач
  logInfo('=== SCRAPING STATISTICS ===');
  logInfo(`📊 Success rate: ${scrapingStats.successRate}% (completed: ${scrapingStats.completed}, failed: ${scrapingStats.failed})`);
  logInfo(`📊 Data extraction rate: ${scrapingStats.withDataRate}% (tasks with data: ${scrapingStats.withData})`);
  logInfo(`⏱ Runtime: ${runtimeMinutes}m ${runtimeSeconds}s`);
  logInfo(`📋 Tasks: total=${scrapingStats.total}, pending=${scrapingStats.pending}, in_progress=${scrapingStats.inProgress}, retried=${scrapingStats.retried}`);
  
  // Добавляем расширенную информацию об ошибках  
  const retryableFailed = completedTasks.filter(t => {
    return t.status === TaskStatus.FAILED && 
      t.errorType && isRetriable(t.errorType);
  }).length;
  
  const maxRetryReached = completedTasks.filter(t => {
    return t.status === TaskStatus.FAILED && t.retryCount >= 3;
  }).length;
  
  if (scrapingStats.failed > 0) {
    logInfo(`🛠 Failures: max_retries=${maxRetryReached}, retriable=${retryableFailed}, non_retriable=${scrapingStats.failed - retryableFailed}`);
  }
  
  // Выводим статистику по типам ошибок
  if (scrapingStats.failed > 0) {
    logInfo('🔍 Error types:');
    for (const [errorType, count] of Object.entries(scrapingStats.errorsByType)) {
      if (count > 0) {
        logInfo(`   - ${errorType}: ${count} tasks (${Math.round((count / scrapingStats.failed) * 100)}%)`);
      }
    }
  }
  
  logInfo('===========================');
}

/**
 * Получает текущую статистику скрапинга
 */
export function getScrapingStatistics(): ScrapingStatistics {
  updateScrapingStatistics();
  return {...scrapingStats};
}

/**
 * Сохраняет статистику скрапинга в JSON файл
 */
export function saveScrapingStatistics(filename: string = 'scraping_stats.json'): void {
  try {
    updateScrapingStatistics();
    
    // Создаем объект с расширенной информацией
    const statsExport = {
      ...scrapingStats,
      exportTimestamp: new Date().toISOString(),
      errorsByTypeList: Object.entries(scrapingStats.errorsByType)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({
          type,
          count,
          percentage: scrapingStats.failed > 0 
            ? Math.round((count / scrapingStats.failed) * 100) 
            : 0,
          description: getErrorDescription(type as ErrorType),
          descriptionEn: getErrorDescriptionEn ? getErrorDescriptionEn(type as ErrorType) : type // Добавляем английское описание
        })),
      
      // Агрегированные данные для анализа
      successMetrics: {
        overallSuccess: scrapingStats.successRate,
        dataSuccess: scrapingStats.withDataRate,
        emptyResults: scrapingStats.completed - scrapingStats.withData,
        emptyResultsRate: scrapingStats.completed > 0 
          ? Math.round(((scrapingStats.completed - scrapingStats.withData) / scrapingStats.completed) * 100)
          : 0
      },
      
      // Производительность
      performance: {
        averageTaskTime: scrapingStats.completed + scrapingStats.failed > 0 
          ? Math.round(scrapingStats.runtime / (scrapingStats.completed + scrapingStats.failed))
          : 0,
        tasksPerMinute: scrapingStats.runtime > 60000 
          ? Math.round(((scrapingStats.completed + scrapingStats.failed) / scrapingStats.runtime) * 60000 * 10) / 10
          : 0,
        timeFormatted: `${Math.floor(scrapingStats.runtime / 60000)}m ${Math.floor((scrapingStats.runtime % 60000) / 1000)}s`
      },
      
      // Детальная информация об ошибках
      errorDetails: {
        retryableFailed: completedTasks.filter(t => {
          return t.status === TaskStatus.FAILED && 
            t.errorType && isRetriable(t.errorType);
        }).length,
        nonRetryableFailed: completedTasks.filter(t => {
          return t.status === TaskStatus.FAILED && 
            t.errorType && !isRetriable(t.errorType);
        }).length,
        maxRetryReached: completedTasks.filter(t => {
          return t.status === TaskStatus.FAILED && t.retryCount >= 3;
        }).length,
        // Группировка ошибок по типам для анализа
        commonErrors: Object.entries(scrapingStats.errorsByType)
          .filter(([_, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type, count]) => ({
            type,
            count,
            percentage: Math.round((count / scrapingStats.failed) * 100),
            description: getErrorDescriptionEn ? getErrorDescriptionEn(type as ErrorType) : getErrorDescription(type as ErrorType)
          }))
      }
    };
    
    // Сохраняем в файл в директории scraper_results
    const filePath = path.join(process.cwd(), 'scraper_results', filename);
    fs.writeFileSync(filePath, JSON.stringify(statsExport, null, 2), 'utf8');
    logInfo(`Saved scraping statistics to ${filePath}`);
    
  } catch (err) {
    logError(`Failed to save scraping statistics: ${err}`);
  }
}

/**
 * Инициализирует менеджер задач
 */
export function initTaskManager(): void {
  // Загружаем данные из файлов
  loadQueue();
  loadCurrentTask();
  loadCompletedTasks();
  
  // Инициализируем статистику
  scrapingStats.startTime = new Date().toISOString();
  
  // Проверка максимального количества попыток
  const MAX_RETRY_ATTEMPTS = 3;
  
  // Если текущая задача была в процессе обработки, помечаем для повторного выполнения
  if (currentTask && currentTask.status === TaskStatus.IN_PROGRESS) {
    logWarning(`Found interrupted task ${currentTask.id}, marking for retry`);
    currentTask.status = TaskStatus.RETRY;
    currentTask.retryCount = (currentTask.retryCount || 0) + 1;
    currentTask.updatedAt = new Date().toISOString();
    currentTask.error = 'Task interrupted by system restart';
    currentTask.errorType = ErrorType.BROWSER_CRASHED; // Самая вероятная причина
    
    // Проверяем количество повторных попыток
    if (currentTask.retryCount > MAX_RETRY_ATTEMPTS) {
      logWarning(`Task ${currentTask.id} failed after ${MAX_RETRY_ATTEMPTS} attempts: ${currentTask.error || 'Unknown error'}`);
      currentTask.status = TaskStatus.FAILED;
      moveTaskToCompleted(currentTask);
    } else {
      // Добавляем в начало очереди для скорейшего выполнения
      taskQueue.unshift(currentTask);
      currentTask = null;
      
      // Сохраняем изменения
      saveQueue();
      saveCurrentTask();
    }
  }
  
  // Обновляем статистику
  updateScrapingStatistics();
  
  logInfo(`Task manager initialized | ${JSON.stringify({
    pendingTasks: taskQueue.length,
    completedTasks: completedTasks.length
  })}`);
}

// Инициализация при загрузке модуля
initTaskManager();