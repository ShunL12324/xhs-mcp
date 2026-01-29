/**
 * @fileoverview Gemini AI 图片理解模块
 * 使用 Google Gemini API 分析笔记图片内容
 * @module core/gemini
 */

import { GoogleGenAI, createUserContent } from '@google/genai';
import sharp from 'sharp';
import { config } from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('gemini');

/**
 * 图片理解配置
 */
const IMAGE_CONFIG = {
  /** 压缩后最大宽度 */
  MAX_WIDTH: 1024,
  /** 压缩后最大高度 */
  MAX_HEIGHT: 1024,
  /** JPEG 压缩质量 */
  QUALITY: 80,
} as const;

/**
 * 单张图片的分析结果
 */
export interface ImageAnalysis {
  /** 图片序号（从0开始） */
  order: number;
  /** 图片内容描述 */
  description: string;
}

/**
 * 笔记图片理解结果
 */
export interface NoteImageUnderstanding {
  /** 各图片的分析结果 */
  images: ImageAnalysis[];
  /** 综合分析（结合所有图片和文字） */
  summary: string;
}

/**
 * 从 URL 下载图片并压缩为 base64
 */
async function fetchAndCompressImage(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // 使用 sharp 压缩图片
  const compressed = await sharp(buffer)
    .resize(IMAGE_CONFIG.MAX_WIDTH, IMAGE_CONFIG.MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: IMAGE_CONFIG.QUALITY })
    .toBuffer();

  return {
    base64: compressed.toString('base64'),
    mimeType: 'image/jpeg',
  };
}

/**
 * System prompt for image understanding
 */
const SYSTEM_PROMPT = `你是一个专业的小红书笔记分析助手。用户会提供一篇笔记的标题、文字内容，以及按顺序排列的图片。

你的任务是：
1. 分析每张图片的具体内容
2. 结合文字和图片，给出综合理解

请以 JSON 格式返回结果，格式如下：
{
  "images": [
    { "order": 0, "description": "第一张图片的描述" },
    { "order": 1, "description": "第二张图片的描述" }
  ],
  "summary": "综合分析：结合文字和所有图片的整体理解"
}

注意：
- description 应简洁准确描述图片内容（50-100字）
- summary 应综合文字和图片，分析笔记的主题、风格、亮点（100-200字）
- 只返回 JSON，不要其他文字`;

/**
 * 安全解析 JSON，处理可能的格式问题
 */
function safeParseJson(text: string): NoteImageUnderstanding | null {
  try {
    // 尝试直接解析
    return JSON.parse(text);
  } catch {
    // 尝试提取 JSON 块
    const jsonMatch = text.match(/\{[\s\S]*\}/);
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
 * 使用 Gemini 理解笔记图片
 * @param title 笔记标题
 * @param desc 笔记文字内容
 * @param imageUrls 图片 URL 列表
 * @returns 图片理解结果
 */
export async function understandNoteImages(
  title: string,
  desc: string,
  imageUrls: string[]
): Promise<NoteImageUnderstanding> {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (imageUrls.length === 0) {
    return {
      images: [],
      summary: desc || title || '无内容',
    };
  }

  log.info('Starting image understanding', { imageCount: imageUrls.length });

  // 初始化 Gemini 客户端
  const ai = new GoogleGenAI({
    apiKey: config.gemini.apiKey,
    httpOptions: config.gemini.baseUrl !== 'https://generativelanguage.googleapis.com'
      ? { baseUrl: config.gemini.baseUrl }
      : undefined,
  });

  // 下载并压缩所有图片
  const imageDataList: { base64: string; mimeType: string }[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      log.debug(`Fetching image ${i + 1}/${imageUrls.length}`);
      const data = await fetchAndCompressImage(imageUrls[i]);
      imageDataList.push(data);
    } catch (error) {
      log.warn(`Failed to fetch image ${i}`, { error, url: imageUrls[i] });
      // 添加占位符
      imageDataList.push({ base64: '', mimeType: 'image/jpeg' });
    }
  }

  // 构建用户消息内容
  const userParts: any[] = [];

  // 添加笔记文字内容
  userParts.push({ text: `【笔记标题】${title}\n\n【笔记内容】${desc || '（无文字内容）'}\n\n【笔记图片】以下是按顺序排列的图片：\n` });

  // 添加图片（按顺序）
  for (let i = 0; i < imageDataList.length; i++) {
    const img = imageDataList[i];
    if (img.base64) {
      userParts.push({ text: `\n<img order=${i}>图片${i}</img>\n` });
      userParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    } else {
      userParts.push({ text: `\n<img order=${i}>（图片加载失败）</img>\n` });
    }
  }

  // 调用 Gemini API
  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: '好的，我会按照要求分析笔记并以 JSON 格式返回结果。' }] },
        { role: 'user', parts: userParts },
      ],
    });

    const text = response.text || '';
    log.debug('Gemini response received', { length: text.length });

    const result = safeParseJson(text);
    if (result) {
      return result;
    }

    // 解析失败，返回原始文本作为 summary
    return {
      images: imageUrls.map((_, i) => ({ order: i, description: '分析失败' })),
      summary: text || '分析失败',
    };
  } catch (error) {
    log.error('Gemini API call failed', { error });
    throw error;
  }
}
