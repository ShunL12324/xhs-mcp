/**
 * Gemini AI 客户端
 */

import { GoogleGenAI } from '@google/genai'
import { readFileSync } from 'fs'
import sharp from 'sharp'
import { jsonrepair } from 'jsonrepair'
import { GEMINI_CONFIG } from '../config.js'
import { createLogger } from '../logger.js'

const log = createLogger('image-processor:gemini')

// 初始化客户端
const genai = new GoogleGenAI({
  apiKey: GEMINI_CONFIG.apiKey,
  httpOptions: { baseUrl: GEMINI_CONFIG.baseUrl },
})

// 图片最大尺寸（用于压缩）
const MAX_IMAGE_SIZE = 1024

/**
 * 压缩图片为 base64
 */
async function compressImageToBase64(imagePath: string): Promise<{ base64: string; mimeType: string }> {
  const image = sharp(imagePath)
  const metadata = await image.metadata()

  // 如果图片太大，按比例缩小
  let processed = image
  if (metadata.width && metadata.height) {
    const maxDim = Math.max(metadata.width, metadata.height)
    if (maxDim > MAX_IMAGE_SIZE) {
      const scale = MAX_IMAGE_SIZE / maxDim
      processed = image.resize({
        width: Math.round(metadata.width * scale),
        height: Math.round(metadata.height * scale),
        fit: 'inside',
      })
    }
  }

  // 转换为 JPEG 并压缩
  const buffer = await processed.jpeg({ quality: 80 }).toBuffer()
  return {
    base64: buffer.toString('base64'),
    mimeType: 'image/jpeg',
  }
}

/**
 * 分析图片内容
 */
export async function analyzeImage(
  imagePath: string,
  prompt: string
): Promise<string> {
  const { base64, mimeType } = await compressImageToBase64(imagePath)

  const response = await genai.models.generateContent({
    model: GEMINI_CONFIG.analysisModel,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      },
    ],
  })

  return response.text || ''
}

/**
 * 分析多张图片
 */
export async function analyzeImages(
  imagePaths: string[],
  prompt: string
): Promise<string> {
  const parts: any[] = []

  for (const imagePath of imagePaths) {
    const { base64, mimeType } = await compressImageToBase64(imagePath)
    parts.push({ inlineData: { mimeType, data: base64 } })
  }

  parts.push({ text: prompt })

  const response = await genai.models.generateContent({
    model: GEMINI_CONFIG.analysisModel,
    contents: [{ role: 'user', parts }],
  })

  return response.text || ''
}

/**
 * 生成文本（无图片输入）
 */
export async function generateText(prompt: string): Promise<string> {
  const response = await genai.models.generateContent({
    model: GEMINI_CONFIG.analysisModel,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return response.text || ''
}

/**
 * 解析 JSON 响应（使用 jsonrepair 修复常见问题）
 */
export function parseJsonResponse<T>(text: string): T {
  // 尝试提取 JSON 块
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  let jsonStr = jsonMatch ? jsonMatch[1] : text

  // 清理可能的前后缀
  jsonStr = jsonStr.trim()

  // 如果不是以 { 或 [ 开头，尝试找到 JSON 开始位置
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    const startBrace = jsonStr.indexOf('{')
    const startBracket = jsonStr.indexOf('[')
    const start = startBrace >= 0 && startBracket >= 0
      ? Math.min(startBrace, startBracket)
      : Math.max(startBrace, startBracket)
    if (start >= 0) {
      jsonStr = jsonStr.slice(start)
    }
  }

  try {
    // 先尝试直接解析
    return JSON.parse(jsonStr)
  } catch {
    // 解析失败，使用 jsonrepair 修复
    try {
      const repaired = jsonrepair(jsonStr)
      log.warn('JSON 已自动修复')
      return JSON.parse(repaired)
    } catch (e) {
      log.error('Failed to parse JSON', { preview: jsonStr.slice(0, 500) })
      throw new Error(`Failed to parse AI response as JSON: ${e}`)
    }
  }
}
