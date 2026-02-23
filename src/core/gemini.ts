/**
 * @fileoverview Gemini AI 图片理解与生成模块
 * 使用 Google Gemini API 分析和生成图片
 * @module core/gemini
 */

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { config, paths } from './config.js';
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
 * 图片理解 System Prompt
 * 基于 Google 最佳实践：明确任务、结构化输出、提供上下文
 */
const UNDERSTANDING_PROMPT = `你是一位专业的小红书内容分析师。请分析用户提供的笔记内容（标题、正文、图片序列）。

## 分析要求

### 每张图片分析
- 识别图片主体内容（人物、物品、场景等）
- 描述构图、色调、风格特点
- 注意图片之间的关联性和叙事逻辑

### 综合分析
- 判断笔记类型（种草、教程、日常分享、测评等）
- 分析目标受众和内容价值
- 总结笔记亮点和改进建议

## 输出格式
严格按以下 JSON 格式输出，不要包含其他文字：
{
  "images": [
    {"order": 0, "description": "图片内容描述，50-100字"}
  ],
  "summary": "综合分析，包含笔记类型、主题、风格、亮点，100-200字"
}`;

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
  imageUrls: string[],
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
    httpOptions:
      config.gemini.baseUrl !== 'https://generativelanguage.googleapis.com'
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

  // 构建用户消息内容 - 图片优先，文字在后（符合多模态最佳实践）
  const userParts: any[] = [];

  // 先添加所有图片（按顺序）
  for (let i = 0; i < imageDataList.length; i++) {
    const img = imageDataList[i];
    if (img.base64) {
      userParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }
  }

  // 再添加文字说明
  userParts.push({
    text: `以上是笔记的 ${imageDataList.length} 张图片（按顺序排列）。

【笔记标题】${title}

【笔记正文】${desc || '（无文字内容）'}

请分析这篇笔记的图片和文字内容。`,
  });

  // 调用 Gemini API
  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      contents: [
        { role: 'user', parts: [{ text: UNDERSTANDING_PROMPT }] },
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

/**
 * 图片生成配置
 */
const GENERATE_CONFIG = {
  /** 默认重试次数 */
  MAX_RETRIES: 3,
  /** 重试延迟（毫秒） */
  RETRY_DELAY: 1000,
  /** 默认宽高比（小红书常用 3:4） */
  DEFAULT_ASPECT_RATIO: '3:4' as const,
} as const;

/**
 * 支持的宽高比
 * 小红书常用比例：3:4（竖图）、1:1（方图）、4:3（横图）
 */
export type AspectRatio = '3:4' | '1:1' | '4:3';

/**
 * 图片风格类型
 */
export type ImageStyle = 'photo' | 'illustration' | 'product' | 'minimalist' | 'sticker';

/**
 * 相机镜头类型
 */
export type ShotType = 'close-up' | 'medium shot' | 'wide shot' | 'macro' | 'aerial' | 'low-angle' | 'high-angle';

/**
 * 结构化图片生成参数
 */
export interface StructuredImageParams {
  /** 主要提示词（会与其他参数组合） */
  prompt: string;
  /** 图片风格 */
  style?: ImageStyle;
  /** 主体描述 */
  subject?: string;
  /** 场景环境 */
  environment?: string;
  /** 光照描述 */
  lighting?: string;
  /** 氛围情绪 */
  mood?: string;
  /** 镜头类型 */
  shotType?: ShotType;
  /** 色彩方案 */
  colorPalette?: string;
}

/**
 * 图片生成选项
 */
export interface GenerateImageOptions {
  /** 图片生成提示词（或结构化参数） */
  prompt: string | StructuredImageParams;
  /** 宽高比，默认 3:4（小红书竖图） */
  aspectRatio?: AspectRatio;
  /** 输出目录，默认 ~/.xhs-mcp/generated */
  outputDir?: string;
}

/**
 * 图片生成结果
 */
export interface GenerateImageResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的图片本地路径 */
  path?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 确保目录存在
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 风格模板 - 每种风格的基础描述词
 */
const STYLE_TEMPLATES: Record<ImageStyle, string> = {
  photo: 'Professional photography, photorealistic, high resolution, sharp focus, natural colors',
  illustration: 'Digital illustration, artistic style, creative composition, vibrant artwork',
  product: 'Commercial product photography, studio lighting, clean background, professional catalog style',
  minimalist: 'Minimalist design, clean composition, negative space, simple and elegant',
  sticker: 'Cute sticker style, kawaii icon, simple outline, adorable character design, white background',
};

/**
 * 从结构化参数构建英文提示词
 * @param params 结构化参数
 * @returns 组合后的英文提示词
 */
export function buildImagePrompt(params: StructuredImageParams): string {
  const parts: string[] = [];

  // 1. 风格模板（如果指定）
  if (params.style) {
    parts.push(STYLE_TEMPLATES[params.style]);
  }

  // 2. 主体描述
  if (params.subject) {
    parts.push(`Subject: ${params.subject}`);
  }

  // 3. 场景环境
  if (params.environment) {
    parts.push(`Environment: ${params.environment}`);
  }

  // 4. 光照
  if (params.lighting) {
    parts.push(`Lighting: ${params.lighting}`);
  }

  // 5. 镜头类型
  if (params.shotType) {
    parts.push(`Shot type: ${params.shotType}`);
  }

  // 6. 色彩方案
  if (params.colorPalette) {
    parts.push(`Color palette: ${params.colorPalette}`);
  }

  // 7. 氛围情绪
  if (params.mood) {
    parts.push(`Mood: ${params.mood}`);
  }

  // 8. 用户的主提示词
  parts.push(params.prompt);

  return parts.join('. ');
}

/**
 * 使用 Gemini 生成图片
 * @param options 生成选项（prompt、aspectRatio、outputDir）
 * @returns 生成结果，包含本地路径
 */
export async function generateImage(options: GenerateImageOptions | string): Promise<GenerateImageResult> {
  // 兼容旧的字符串参数
  const opts: GenerateImageOptions = typeof options === 'string' ? { prompt: options } : options;

  const { prompt: promptInput, aspectRatio = GENERATE_CONFIG.DEFAULT_ASPECT_RATIO, outputDir } = opts;

  // 构建最终提示词
  const finalPrompt = typeof promptInput === 'string' ? promptInput : buildImagePrompt(promptInput);

  if (!config.gemini.apiKey) {
    return { success: false, error: 'GEMINI_API_KEY is not configured' };
  }

  log.info('Starting image generation', {
    prompt: finalPrompt.slice(0, 100),
    aspectRatio,
  });

  // 初始化 Gemini 客户端
  const ai = new GoogleGenAI({
    apiKey: config.gemini.apiKey,
    httpOptions:
      config.gemini.baseUrl !== 'https://generativelanguage.googleapis.com'
        ? { baseUrl: config.gemini.baseUrl }
        : undefined,
  });

  // 确保输出目录存在
  const targetDir = outputDir || path.join(paths.dataDir, 'generated');
  ensureDir(targetDir);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= GENERATE_CONFIG.MAX_RETRIES; attempt++) {
    try {
      log.debug(`Generation attempt ${attempt}/${GENERATE_CONFIG.MAX_RETRIES}`);

      const response = await ai.models.generateContent({
        model: config.gemini.imageGenerateModel,
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          // @ts-ignore - imageConfig 是 Gemini 图片生成的有效参数
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });

      // 查找图片数据
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          // 生成 UUID 文件名
          const imageId = randomUUID();
          const mimeType = part.inlineData.mimeType || 'image/jpeg';
          const ext = mimeType.includes('png') ? 'png' : 'jpg';
          const filePath = path.join(targetDir, `${imageId}.${ext}`);

          // 保存图片
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(filePath, buffer);

          log.info('Image generated successfully', { path: filePath, aspectRatio });
          return { success: true, path: filePath };
        }
      }

      // 没有找到图片数据
      lastError = new Error('No image data in response');
      log.warn('No image data in response, retrying...');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      log.warn(`Generation attempt ${attempt} failed`, { error: lastError.message });
    }

    // 等待后重试
    if (attempt < GENERATE_CONFIG.MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, GENERATE_CONFIG.RETRY_DELAY));
    }
  }

  log.error('Image generation failed after all retries', { error: lastError?.message });
  return { success: false, error: lastError?.message || 'Unknown error' };
}
