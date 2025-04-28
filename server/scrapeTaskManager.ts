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
  result?: any;                  // Результаты выполнения задачи (если есть)
}

// Статусы задачи
export enum TaskStatus {
  PENDING = 'pending',           // Ожидает выполнения
  IN_PROGRESS = 'in_progress',   // В процессе выполнения
  COMPLETED = 'completed',       // Успешно завершена
  FAILED = 'failed',             // Завершена с ошибкой
  RETRY = 'retry'                // Будет повторена
}

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
 * Обновляет статус задачи
 */
export function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  result?: any,
  error?: string
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
  // Проверяем, запущена ли уже обработка
  if (isProcessing || !taskProcessor) {
    return;
  }
  
  // Проверяем, есть ли задачи в очереди
  if (taskQueue.length === 0) {
    logInfo('Task queue is empty, nothing to process');
    return;
  }
  
  try {
    // Устанавливаем флаг обработки
    isProcessing = true;
    
    // Берем задачу с наивысшим приоритетом (с начала очереди)
    const task = taskQueue[0];
    currentTask = task;
    
    // Обновляем статус задачи
    task.status = TaskStatus.IN_PROGRESS;
    task.startedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    // Сохраняем состояние
    saveCurrentTask();
    saveQueue();
    
    logInfo(`Processing task ${task.id}: ${task.cityNormalized}/${task.districtName}/${task.roomType}`);
    
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
    if (!currentTask) {
      logError(`Error processing task but currentTask is null: ${error}`);
      isProcessing = false;
      return;
    }
    
    // Обработка ошибки
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Error processing task ${currentTask.id}: ${errorMessage}`);
    
    // Если достигнуто максимальное число повторов, помечаем как неудачную
    if (currentTask.retryCount >= 3) {
      currentTask.status = TaskStatus.FAILED;
      currentTask.completedAt = new Date().toISOString();
      currentTask.updatedAt = new Date().toISOString();
      currentTask.error = errorMessage;
      
      // Перемещаем в выполненные
      moveTaskToCompleted(currentTask);
    } else {
      // Иначе помечаем для повторного выполнения
      currentTask.status = TaskStatus.RETRY;
      currentTask.retryCount++;
      currentTask.updatedAt = new Date().toISOString();
      currentTask.error = errorMessage;
      
      // Перемещаем в конец очереди
      const taskIndex = taskQueue.findIndex(t => t.id === currentTask!.id);
      if (taskIndex >= 0) {
        taskQueue.splice(taskIndex, 1);
      }
      
      // Добавляем с повышенным приоритетом (но не в самое начало)
      // чтобы избежать блокировки обработки одной проблемной задачей
      taskQueue.splice(Math.min(taskQueue.length, 5), 0, currentTask);
      
      saveQueue();
      currentTask = null;
      saveCurrentTask();
    }
  } finally {
    // Сбрасываем флаг обработки
    isProcessing = false;
    
    // Если в очереди остались задачи, продолжаем обработку
    if (taskQueue.length > 0) {
      // Небольшая задержка между задачами
      setTimeout(processNextTask, 1000);
    } else {
      logInfo('Task queue processing completed');
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
 * Инициализирует менеджер задач
 */
export function initTaskManager(): void {
  // Загружаем данные из файлов
  loadQueue();
  loadCurrentTask();
  loadCompletedTasks();
  
  // Если текущая задача была в процессе обработки, помечаем для повторного выполнения
  if (currentTask && currentTask.status === TaskStatus.IN_PROGRESS) {
    logWarning(`Found interrupted task ${currentTask.id}, marking for retry`);
    currentTask.status = TaskStatus.RETRY;
    currentTask.retryCount++;
    currentTask.updatedAt = new Date().toISOString();
    currentTask.error = 'Task interrupted by system restart';
    
    // Добавляем в начало очереди для немедленного выполнения
    taskQueue.unshift(currentTask);
    currentTask = null;
    
    // Сохраняем изменения
    saveQueue();
    saveCurrentTask();
  }
  
  logInfo('Task manager initialized', { 
    pendingTasks: taskQueue.length,
    completedTasks: completedTasks.length
  });
}

// Инициализация при загрузке модуля
initTaskManager();