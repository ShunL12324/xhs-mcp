/**
 * @fileoverview Logger utility for xhs-mcp
 * Provides structured logging to both console (stderr) and file
 */

import * as fs from 'fs';
import * as path from 'path';
import { XHS_MCP_DIR } from './paths.js';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Log level names
const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// Current log level (can be configured)
let currentLogLevel = LogLevel.DEBUG;

// Log file path
const LOG_DIR = path.join(XHS_MCP_DIR, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'xhs-mcp.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file stream
let logStream: fs.WriteStream | null = null;

function getLogStream(): fs.WriteStream {
  if (!logStream) {
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  }
  return logStream;
}

/**
 * Format a log message
 */
function formatMessage(level: LogLevel, module: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const levelName = LEVEL_NAMES[level];
  let formatted = `${timestamp} [${levelName}] [${module}] ${message}`;

  if (data !== undefined) {
    if (typeof data === 'object') {
      try {
        formatted += ` ${JSON.stringify(data)}`;
      } catch {
        formatted += ` [Object]`;
      }
    } else {
      formatted += ` ${data}`;
    }
  }

  return formatted;
}

/**
 * Write log to file and console
 */
function writeLog(level: LogLevel, module: string, message: string, data?: any): void {
  if (level < currentLogLevel) {
    return;
  }

  const formatted = formatMessage(level, module, message, data);

  // Write to stderr (console)
  console.error(formatted);

  // Write to file
  try {
    const stream = getLogStream();
    stream.write(formatted + '\n');
  } catch (e) {
    // Ignore file write errors
  }
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: any) => writeLog(LogLevel.DEBUG, module, message, data),
    info: (message: string, data?: any) => writeLog(LogLevel.INFO, module, message, data),
    warn: (message: string, data?: any) => writeLog(LogLevel.WARN, module, message, data),
    error: (message: string, data?: any) => writeLog(LogLevel.ERROR, module, message, data),
  };
}

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get the log file path
 */
export function getLogFilePath(): string {
  return LOG_FILE;
}

/**
 * Close the log stream (call on shutdown)
 */
export function closeLogger(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

// Default logger instance
export const logger = createLogger('xhs-mcp');
