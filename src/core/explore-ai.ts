/**
 * @fileoverview Explore AI 决策模块
 * 使用 Gemini API 进行笔记选择和评论生成
 * @module core/explore-ai
 */

import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import { createLogger } from './logger.js';
import { renderPrompt } from './prompt-manager.js';

const log = createLogger('explore-ai');

/**
 * 账号信息（用于读取对应的 prompt）
 */
export interface AccountInfo {
  name: string;
  id: string;
}

/**
 * 笔记简要信息（用于 AI 选择）
 */
export interface NoteBrief {
  id: string;
  title: string;
  likes: string;
  type: string;
}

/**
 * AI 选择笔记的结果
 */
export interface SelectNoteResult {
  noteId: string | null;
  reason: string;
}

/**
 * AI 生成评论的结果
 */
export interface GenerateCommentResult {
  comment: string;
}

/**
 * 评论简要信息（用于 AI 选择点赞目标）
 */
export interface CommentBrief {
  id: string;
  content: string;
  likeCount: string;
  liked: boolean;
}

/**
 * AI 选择点赞目标的结果
 */
export interface SelectLikeTargetResult {
  /** 点赞目标：'post' 点赞帖子，'comment:{id}' 点赞评论，'none' 不点赞 */
  target: string;
  reason: string;
}

/**
 * 安全解析 JSON，处理 markdown 代码块和格式问题
 */
function safeParseJson<T>(text: string): T | null {
  try {
    // 先尝试直接解析
    return JSON.parse(text);
  } catch {
    // 尝试移除 markdown 代码块
    let cleaned = text.trim();

    // 移除 ```json ... ``` 或 ``` ... ```
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1];
    }

    // 尝试提取 JSON 对象
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        log.warn('Failed to parse JSON from response', { text: text.slice(0, 200) });
        return null;
      }
    }

    return null;
  }
}

/**
 * 获取 Gemini 客户端
 */
function getAIClient(): GoogleGenAI {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return new GoogleGenAI({
    apiKey: config.gemini.apiKey,
    httpOptions: config.gemini.baseUrl !== 'https://generativelanguage.googleapis.com'
      ? { baseUrl: config.gemini.baseUrl }
      : undefined,
  });
}

/**
 * 从笔记列表中选择一篇感兴趣的
 * @param account 账号信息
 * @param notes 笔记列表
 * @param interests 感兴趣的关键词（可选）
 */
export async function selectNoteToOpen(
  account: AccountInfo,
  notes: NoteBrief[],
  interests: string[] = []
): Promise<SelectNoteResult> {
  const ai = getAIClient();

  // 格式化笔记列表
  const notesText = notes.map((n, i) =>
    `${i + 1}. [${n.id}] ${n.title} (${n.likes}赞, ${n.type === 'video' ? '视频' : '图文'})`
  ).join('\n');

  // 使用 prompt-manager 渲染 prompt
  const prompt = await renderPrompt(account.name, account.id, 'select', {
    notes: notesText,
    interests: interests.length > 0 ? interests.join(', ') : '',
  });

  log.debug('Calling AI to select note', { noteCount: notes.length });

  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text || '';
    log.debug('AI response', { text: text.slice(0, 200) });

    const result = safeParseJson<SelectNoteResult>(text);
    if (result && (result.noteId !== undefined)) {
      return result;
    }

    return { noteId: null, reason: 'AI 响应解析失败' };
  } catch (error) {
    log.error('AI select note failed', { error });
    return { noteId: null, reason: `AI 调用失败: ${error}` };
  }
}

/**
 * 为笔记生成评论
 */
export async function generateComment(
  account: AccountInfo,
  title: string,
  content: string
): Promise<GenerateCommentResult> {
  const ai = getAIClient();

  // 截断过长的内容
  const truncatedContent = content.length > 500
    ? content.slice(0, 500) + '...'
    : content;

  // 使用 prompt-manager 渲染 prompt
  const prompt = await renderPrompt(account.name, account.id, 'comment', {
    title,
    content: truncatedContent,
  });

  log.debug('Calling AI to generate comment');

  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text || '';
    log.debug('AI comment response', { text: text.slice(0, 200) });

    const result = safeParseJson<GenerateCommentResult>(text);
    if (result && result.comment) {
      return result;
    }

    // 如果解析失败，返回一个默认评论
    return { comment: '很棒的分享！' };
  } catch (error) {
    log.error('AI generate comment failed', { error });
    return { comment: '很棒的分享！' };
  }
}

/**
 * 选择点赞目标：帖子本身、某条评论、或不点赞
 * @param account 账号信息
 * @param noteTitle 帖子标题
 * @param noteDesc 帖子描述
 * @param comments 评论列表
 */
export async function selectLikeTarget(
  account: AccountInfo,
  noteTitle: string,
  noteDesc: string,
  comments: CommentBrief[]
): Promise<SelectLikeTargetResult> {
  const ai = getAIClient();

  // 过滤已点赞的评论
  const availableComments = comments.filter(c => !c.liked);

  // 格式化评论列表
  const commentsText = availableComments.length > 0
    ? availableComments.map((c, i) =>
        `${i + 1}. [${c.id}] ${c.content.slice(0, 50)}${c.content.length > 50 ? '...' : ''} (${c.likeCount}赞)`
      ).join('\n')
    : '（暂无评论）';

  // 截断过长的内容
  const truncatedContent = noteDesc.length > 200
    ? noteDesc.slice(0, 200) + '...'
    : noteDesc;

  // 使用 prompt-manager 渲染 prompt
  const prompt = await renderPrompt(account.name, account.id, 'like-target', {
    title: noteTitle,
    content: truncatedContent,
    comments: commentsText,
  });

  log.debug('Calling AI to select like target', { commentCount: availableComments.length });

  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text || '';
    log.debug('AI like target response', { text: text.slice(0, 200) });

    const result = safeParseJson<SelectLikeTargetResult>(text);
    if (result && result.target) {
      return result;
    }

    // 默认点赞帖子
    return { target: 'post', reason: 'AI 响应解析失败，默认点赞帖子' };
  } catch (error) {
    log.error('AI select like target failed', { error });
    return { target: 'post', reason: `AI 调用失败: ${error}` };
  }
}
