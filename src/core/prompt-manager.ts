/**
 * @fileoverview Prompt 管理器
 * 管理账号的 persona 和 prompt 文件
 * @module core/prompt-manager
 */

import fs from 'fs';
import path from 'path';
import { Liquid } from 'liquidjs';
import { paths } from './config.js';
import { createLogger } from './logger.js';
import { DEFAULT_PERSONA, DEFAULT_SELECT, DEFAULT_COMMENT, DEFAULT_LIKE_TARGET } from './prompts/defaults.js';

const log = createLogger('prompt-manager');
const liquid = new Liquid();

/**
 * Prompt 类型
 */
export type PromptType = 'persona' | 'select' | 'comment' | 'like-target';

/**
 * 获取账号 prompt 目录名
 */
function getPromptDirName(accountName: string, accountId: string): string {
  // 清理账号名中的特殊字符，保留中文、字母、数字
  const safeName = accountName.replace(/[<>:"/\\|?*]/g, '_');
  // 取 accountId 前 8 位
  const shortId = accountId.slice(0, 8);
  return `${safeName}_${shortId}`;
}

/**
 * 获取账号 prompt 目录路径
 */
export function getPromptDir(accountName: string, accountId: string): string {
  return path.join(paths.prompts, getPromptDirName(accountName, accountId));
}

/**
 * 获取 prompt 文件路径
 */
function getPromptFilePath(accountName: string, accountId: string, type: PromptType): string {
  return path.join(getPromptDir(accountName, accountId), `${type}.txt`);
}

/**
 * 确保 prompts 目录存在
 */
function ensurePromptsDir(): void {
  if (!fs.existsSync(paths.prompts)) {
    fs.mkdirSync(paths.prompts, { recursive: true });
  }
}

/**
 * 初始化账号 prompt 文件
 * 创建目录并写入默认模板
 */
export function initAccountPrompts(accountName: string, accountId: string): void {
  ensurePromptsDir();

  const dir = getPromptDir(accountName, accountId);

  // 如果目录已存在，跳过
  if (fs.existsSync(dir)) {
    log.debug('Prompt dir already exists', { dir });
    return;
  }

  // 创建目录
  fs.mkdirSync(dir, { recursive: true });

  // 写入默认文件
  fs.writeFileSync(path.join(dir, 'persona.txt'), DEFAULT_PERSONA, 'utf-8');
  fs.writeFileSync(path.join(dir, 'select.txt'), DEFAULT_SELECT, 'utf-8');
  fs.writeFileSync(path.join(dir, 'comment.txt'), DEFAULT_COMMENT, 'utf-8');
  fs.writeFileSync(path.join(dir, 'like-target.txt'), DEFAULT_LIKE_TARGET, 'utf-8');

  log.info('Initialized account prompts', { accountName, accountId, dir });
}

/**
 * 获取 prompt 文件内容
 * 如果文件不存在，自动初始化账号的 prompt 目录
 */
export function getPrompt(accountName: string, accountId: string, type: PromptType): string {
  // 自动初始化（兼容老账号）
  if (!hasPromptDir(accountName, accountId)) {
    initAccountPrompts(accountName, accountId);
  }

  const filePath = getPromptFilePath(accountName, accountId, type);

  if (!fs.existsSync(filePath)) {
    // 文件不存在，返回默认值（理论上不应该走到这里，因为上面已经初始化过）
    switch (type) {
      case 'persona': return DEFAULT_PERSONA;
      case 'select': return DEFAULT_SELECT;
      case 'comment': return DEFAULT_COMMENT;
      case 'like-target': return DEFAULT_LIKE_TARGET;
    }
  }

  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 更新 prompt 文件内容
 */
export function setPrompt(accountName: string, accountId: string, type: PromptType, content: string): void {
  ensurePromptsDir();

  const dir = getPromptDir(accountName, accountId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = getPromptFilePath(accountName, accountId, type);
  fs.writeFileSync(filePath, content, 'utf-8');

  log.info('Updated prompt', { accountName, type });
}

/**
 * 渲染 prompt 模板
 * 自动读取 persona 并注入到 select/comment 模板中
 * 如果账号 prompt 目录不存在，自动创建
 */
export async function renderPrompt(
  accountName: string,
  accountId: string,
  type: 'select' | 'comment' | 'like-target',
  variables: Record<string, any> = {}
): Promise<string> {
  // 自动初始化（兼容老账号）
  if (!hasPromptDir(accountName, accountId)) {
    log.info('Auto-initializing prompts for existing account', { accountName, accountId });
    initAccountPrompts(accountName, accountId);
  }

  // 读取 persona
  const persona = getPrompt(accountName, accountId, 'persona');

  // 读取对应模板
  const template = getPrompt(accountName, accountId, type);

  // 合并变量
  const allVariables = {
    persona,
    ...variables,
  };

  // 渲染模板
  try {
    return await liquid.parseAndRender(template, allVariables);
  } catch (error) {
    log.error('Failed to render prompt', { type, error });
    // 降级：直接替换 {{ persona }}
    return template.replace(/\{\{\s*persona\s*\}\}/g, persona);
  }
}

/**
 * 检查账号是否有 prompt 目录
 */
export function hasPromptDir(accountName: string, accountId: string): boolean {
  return fs.existsSync(getPromptDir(accountName, accountId));
}

/**
 * 删除账号 prompt 目录
 */
export function deleteAccountPrompts(accountName: string, accountId: string): void {
  const dir = getPromptDir(accountName, accountId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
    log.info('Deleted account prompts', { accountName, accountId });
  }
}
