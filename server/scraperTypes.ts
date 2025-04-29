import { ScrapeTask } from './scraper';

// Перечисление возможных типов задач скрапинга
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RETRY = 'retry',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Перечисление типов ошибок скрапинга
export enum ErrorType {
  COOKIE_NOT_ACCEPTED = 'cookie_not_accepted',
  NO_LISTINGS_FOUND = 'no_listings_found',
  BOT_DETECTED = 'bot_detected',
  BROWSER_CRASHED = 'browser_crashed',
  TIMEOUT_AT_PAGE_LOAD = 'timeout_at_page_load',
  NAVIGATION_ERROR = 'navigation_error',
  BROWSER_CONTEXT_CLOSED = 'browser_context_closed',
  MEMORY_LIMIT_EXCEEDED = 'memory_limit_exceeded',
  CONNECTION_ERROR = 'connection_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Интерфейс для результата скрапинга с расширенной информацией об ошибках
export interface ScrapeResult {
  count: number;
  reportedCount: number;
  avgPrice: number;
  avgPricePerSqm: number;
  prices: number[];
  pricesPerSqm: number[];
  hasListings?: boolean;
  botDetected?: boolean;
  errorMessage?: string;
  errorStack?: string;
  errorType?: ErrorType;
  retriable?: boolean;
  hasCookieBanner?: boolean;
  missingSelectors?: boolean;
  hasErrors?: boolean;
  errorMessages?: string[];
}

// Интерфейс для диагностической информации
export interface DiagnosticInfo {
  cookieAttempted?: boolean;
  cookieAccepted?: boolean;
  cookieError?: string;
  listingElementsFound?: boolean;
  pageUrl?: string;
  htmlSize?: number;
  screenshots?: ScreenshotInfo[];
  browserMemoryUsage?: number;
  errorType?: ErrorType;
  errorDetails?: string;
  timestamp?: string;
}

// Интерфейс для информации о скриншотах
export interface ScreenshotInfo {
  name: string;
  path: string;
  timestamp: string;
}

// Функция для анализа ошибки и определения её типа
export function determineErrorType(error: Error | string): ErrorType {
  const errorStr = typeof error === 'string' ? error : error.message;
  
  if (errorStr.includes('cookie') || errorStr.includes('consent')) {
    return ErrorType.COOKIE_NOT_ACCEPTED;
  }
  
  if (errorStr.includes('No listing elements found')) {
    return ErrorType.NO_LISTINGS_FOUND;
  }
  
  if (errorStr.includes('Bot detection triggered')) {
    return ErrorType.BOT_DETECTED;
  }
  
  if (errorStr.includes('browser crashed') || errorStr.includes('browser was disconnected')) {
    return ErrorType.BROWSER_CRASHED;
  }
  
  if (errorStr.includes('Target page, context or browser has been closed')) {
    return ErrorType.BROWSER_CONTEXT_CLOSED;
  }
  
  if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
    return ErrorType.TIMEOUT_AT_PAGE_LOAD;
  }
  
  if (errorStr.includes('net::') || errorStr.includes('ERR_CONNECTION') || 
     errorStr.includes('ERR_INTERNET') || errorStr.includes('ERR_NAME')) {
    return ErrorType.CONNECTION_ERROR;
  }
  
  if (errorStr.includes('navigation') || errorStr.includes('reload') || 
     errorStr.includes('ERR_ABORTED') || errorStr.includes('goto')) {
    return ErrorType.NAVIGATION_ERROR;
  }
  
  if (errorStr.includes('memory limit') || errorStr.includes('Memory usage critical')) {
    return ErrorType.MEMORY_LIMIT_EXCEEDED;
  }
  
  return ErrorType.UNKNOWN_ERROR;
}

// Функция для определения возможности повторного запуска задачи
export function isRetriable(errorType: ErrorType): boolean {
  // Ошибки, которые имеет смысл повторять
  const retriableErrors = [
    ErrorType.CONNECTION_ERROR,
    ErrorType.TIMEOUT_AT_PAGE_LOAD,
    ErrorType.NAVIGATION_ERROR,
    ErrorType.BROWSER_CRASHED,
    ErrorType.BROWSER_CONTEXT_CLOSED,
    ErrorType.MEMORY_LIMIT_EXCEEDED
  ];
  
  return retriableErrors.includes(errorType);
}

// Функция для получения описания ошибки на русском
export function getErrorDescription(errorType: ErrorType): string {
  const descriptions: Record<ErrorType, string> = {
    [ErrorType.COOKIE_NOT_ACCEPTED]: 'Не удалось принять cookie-соглашение',
    [ErrorType.NO_LISTINGS_FOUND]: 'Не найдено объявлений на странице',
    [ErrorType.BOT_DETECTED]: 'Обнаружена защита от ботов',
    [ErrorType.BROWSER_CRASHED]: 'Браузер аварийно завершил работу',
    [ErrorType.TIMEOUT_AT_PAGE_LOAD]: 'Таймаут при загрузке страницы',
    [ErrorType.NAVIGATION_ERROR]: 'Ошибка навигации по сайту',
    [ErrorType.BROWSER_CONTEXT_CLOSED]: 'Контекст браузера был закрыт',
    [ErrorType.MEMORY_LIMIT_EXCEEDED]: 'Превышен лимит памяти',
    [ErrorType.CONNECTION_ERROR]: 'Ошибка соединения с сайтом',
    [ErrorType.UNKNOWN_ERROR]: 'Неизвестная ошибка'
  };
  
  return descriptions[errorType];
}

// Функция для получения описания ошибки на английском
export function getErrorDescriptionEn(errorType: ErrorType): string {
  const descriptions: Record<ErrorType, string> = {
    [ErrorType.COOKIE_NOT_ACCEPTED]: 'Failed to accept cookie consent',
    [ErrorType.NO_LISTINGS_FOUND]: 'No property listings found on page',
    [ErrorType.BOT_DETECTED]: 'Bot protection detected',
    [ErrorType.BROWSER_CRASHED]: 'Browser crashed',
    [ErrorType.TIMEOUT_AT_PAGE_LOAD]: 'Timeout during page load',
    [ErrorType.NAVIGATION_ERROR]: 'Website navigation error',
    [ErrorType.BROWSER_CONTEXT_CLOSED]: 'Browser context was closed',
    [ErrorType.MEMORY_LIMIT_EXCEEDED]: 'Memory limit exceeded',
    [ErrorType.CONNECTION_ERROR]: 'Connection error to website',
    [ErrorType.UNKNOWN_ERROR]: 'Unknown error'
  };
  
  return descriptions[errorType];
}

// Функция для создания итогового объекта ошибки
export function createErrorResult(
  error: Error | string, 
  diagnosticInfo?: DiagnosticInfo
): { 
  result: ScrapeResult, 
  enhancedDiagnostics: DiagnosticInfo 
} {
  const errorType = determineErrorType(error);
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;
  const retriable = isRetriable(errorType);
  
  // Создаем базовый результат
  const result: ScrapeResult = {
    count: 0,
    reportedCount: 0,
    avgPrice: 0,
    avgPricePerSqm: 0,
    prices: [],
    pricesPerSqm: [],
    errorMessage,
    errorStack,
    errorType,
    retriable,
    botDetected: errorType === ErrorType.BOT_DETECTED,
    hasListings: false
  };
  
  // Расширенная диагностика
  const enhancedDiagnostics: DiagnosticInfo = {
    ...diagnosticInfo,
    errorType,
    errorDetails: errorMessage,
    timestamp: new Date().toISOString()
  };
  
  return { result, enhancedDiagnostics };
}