/**
 * Система логирования для скрапера
 */
import * as fs from 'fs';
import * as path from 'path';

// Уровни логирования
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  CRITICAL = 4
}

// Текущий уровень логирования (по умолчанию INFO)
let currentLogLevel = LogLevel.INFO;

// Идентификатор сессии логирования
const logSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

// Путь к директории логов
const LOG_DIR = path.join(process.cwd(), 'logs');

// Создаем директорию для логов, если она не существует
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error(`Failed to create log directory: ${err}`);
  }
}

// Текущий лог-файл
const LOG_FILE = path.join(LOG_DIR, `scraper_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Форматирует сообщение для лога
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  sessionData?: any
): string {
  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];
  
  let formattedMessage = `[${timestamp}][${logSessionId}][${levelName}] ${message}`;
  
  if (sessionData) {
    const sessionStr = typeof sessionData === 'string' 
      ? sessionData 
      : JSON.stringify(sessionData);
    formattedMessage += ` | ${sessionStr}`;
  }
  
  return formattedMessage;
}

/**
 * Записывает сообщение в лог-файл
 */
function writeToLogFile(message: string): void {
  try {
    fs.appendFileSync(LOG_FILE, message + '\n');
  } catch (err) {
    console.error(`Failed to write to log file: ${err}`);
  }
}

/**
 * Основная функция логирования
 */
export function log(
  message: string,
  level: LogLevel = LogLevel.INFO,
  sessionData?: any
): void {
  // Пропускаем сообщения с уровнем ниже текущего
  if (level < currentLogLevel) return;
  
  const formattedMessage = formatLogMessage(level, message, sessionData);
  
  // Выводим в консоль
  console.log(formattedMessage);
  
  // Записываем в файл
  writeToLogFile(formattedMessage);
}

// Вспомогательные функции для разных уровней логирования
export const logDebug = (message: string, sessionData?: any) => 
  log(message, LogLevel.DEBUG, sessionData);

export const logInfo = (message: string, sessionData?: any) => 
  log(message, LogLevel.INFO, sessionData);

export const logWarning = (message: string, sessionData?: any) => 
  log(message, LogLevel.WARNING, sessionData);

export const logError = (message: string, sessionData?: any) => 
  log(message, LogLevel.ERROR, sessionData);

export const logCritical = (message: string, sessionData?: any) => 
  log(message, LogLevel.CRITICAL, sessionData);

/**
 * Установка текущего уровня логирования
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
  logInfo(`Log level set to ${LogLevel[level]}`);
}

/**
 * Создает новую сессию логирования
 */
export function newLogSession(): string {
  const oldSession = logSessionId;
  // Обновляем глобальную переменную с новым ID сессии
  (global as any).logSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  logInfo(`Switching log session from ${oldSession} to ${(global as any).logSessionId}`);
  return (global as any).logSessionId;
}

/**
 * Получает текущую память процесса в МБ
 */
export function getCurrentMemoryUsage(): number {
  const memoryData = process.memoryUsage();
  // Используем rss (resident set size) - общий размер рабочего пространства процесса
  const memoryInMb = Math.round(memoryData.rss / 1024 / 1024);
  return memoryInMb;
}

/**
 * Логирует текущее использование памяти
 */
export function logMemoryUsage(): void {
  const memoryData = process.memoryUsage();
  const formatted = {
    rss: `${Math.round(memoryData.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryData.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryData.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round((memoryData.external || 0) / 1024 / 1024)} MB`
  };
  
  logDebug(`Memory usage`, formatted);
}

// Сразу инициализируем логирование
logInfo(`Logger initialized with session ${logSessionId}`);