/**
 * @fileoverview 统一配置管理模块
 * 通过环境变量控制应用行为，提供类型安全的配置访问
 * @module core/config
 */

import path from 'path';
import os from 'os';

/**
 * 日志级别枚举
 */
export type LogLevelName = 'debug' | 'info' | 'warn' | 'error';

/**
 * 解析布尔环境变量
 * 支持 true/false, 1/0, yes/no
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const v = value.toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  return defaultValue;
}

/**
 * 解析整数环境变量
 */
function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 解析日志级别
 */
function parseLogLevel(value: string | undefined, defaultValue: LogLevelName): LogLevelName {
  if (value === undefined) return defaultValue;
  const v = value.toLowerCase().trim() as LogLevelName;
  if (['debug', 'info', 'warn', 'error'].includes(v)) return v;
  return defaultValue;
}

/**
 * 应用配置
 * 所有配置项都可通过环境变量覆盖
 */
export const config = {
  /**
   * 服务器配置
   */
  server: {
    /** HTTP 服务端口 (XHS_MCP_PORT) */
    port: parseInteger(process.env.XHS_MCP_PORT, 18060),
  },

  /**
   * 数据存储配置
   */
  data: {
    /** 数据目录路径 (XHS_MCP_DATA_DIR)，默认 ~/.xhs-mcp */
    dir: process.env.XHS_MCP_DATA_DIR || path.join(os.homedir(), '.xhs-mcp'),
  },

  /**
   * 日志配置
   */
  log: {
    /** 日志级别 (XHS_MCP_LOG_LEVEL): debug | info | warn | error */
    level: parseLogLevel(process.env.XHS_MCP_LOG_LEVEL, 'debug'),
  },

  /**
   * 浏览器配置
   */
  browser: {
    /** 是否使用无头模式 (XHS_MCP_HEADLESS)，默认 true */
    headless: parseBoolean(process.env.XHS_MCP_HEADLESS, true),
    /** 请求间隔（毫秒）(XHS_MCP_REQUEST_INTERVAL)，用于速率限制 */
    requestInterval: parseInteger(process.env.XHS_MCP_REQUEST_INTERVAL, 2000),
  },

  /**
   * 超时配置（毫秒）
   */
  timeout: {
    /** 页面加载超时 (XHS_MCP_TIMEOUT_PAGE_LOAD) */
    pageLoad: parseInteger(process.env.XHS_MCP_TIMEOUT_PAGE_LOAD, 30000),
    /** 视频上传超时 (XHS_MCP_TIMEOUT_VIDEO_UPLOAD)，默认 5 分钟 */
    videoUpload: parseInteger(process.env.XHS_MCP_TIMEOUT_VIDEO_UPLOAD, 300000),
  },

  /**
   * Gemini AI 配置（预留）
   */
  gemini: {
    /** Gemini API Base URL (GEMINI_BASE_URL) */
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
    /** Gemini API Key (GEMINI_API_KEY) */
    apiKey: process.env.GEMINI_API_KEY || '',
  },
} as const;

/**
 * 派生路径（基于 data.dir）
 */
export const paths = {
  /** 数据目录 */
  get dataDir() {
    return config.data.dir;
  },
  /** SQLite 数据库文件 */
  get database() {
    return path.join(config.data.dir, 'data.db');
  },
  /** 下载目录 */
  get downloads() {
    return path.join(config.data.dir, 'downloads');
  },
  /** 图片下载目录 */
  get images() {
    return path.join(config.data.dir, 'downloads', 'images');
  },
  /** 视频下载目录 */
  get videos() {
    return path.join(config.data.dir, 'downloads', 'videos');
  },
  /** QR 码临时目录 */
  get qrcode() {
    return path.join(config.data.dir, 'qrcode');
  },
  /** 日志目录 */
  get logs() {
    return path.join(config.data.dir, 'logs');
  },
  /** 日志文件 */
  get logFile() {
    return path.join(config.data.dir, 'logs', 'xhs-mcp.log');
  },
};

/**
 * 获取笔记图片下载路径
 */
export function getImageDownloadPath(noteId: string): string {
  return path.join(paths.images, noteId);
}

/**
 * 获取笔记视频下载路径
 */
export function getVideoDownloadPath(noteId: string): string {
  return path.join(paths.videos, noteId);
}

/**
 * 打印当前配置（用于调试）
 */
export function printConfig(): void {
  console.error('=== XHS-MCP Configuration ===');
  console.error(`  Server Port: ${config.server.port}`);
  console.error(`  Data Directory: ${config.data.dir}`);
  console.error(`  Log Level: ${config.log.level}`);
  console.error(`  Headless Mode: ${config.browser.headless}`);
  console.error(`  Request Interval: ${config.browser.requestInterval}ms`);
  console.error(`  Page Load Timeout: ${config.timeout.pageLoad}ms`);
  console.error(`  Video Upload Timeout: ${config.timeout.videoUpload}ms`);
  console.error(`  Gemini Base URL: ${config.gemini.baseUrl}`);
  console.error(`  Gemini API Key: ${config.gemini.apiKey ? '[SET]' : '[NOT SET]'}`);
  console.error('=============================');
}
