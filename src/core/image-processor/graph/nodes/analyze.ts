/**
 * Phase 1: 内容分析节点
 *
 * 输入: content (Markdown), screenshots[]
 * 输出: contentBlocks[], screenshotAnalysis[], contentType, theme
 */

import { GoogleGenAI } from '@google/genai'
import sharp from 'sharp'
import { GEMINI_CONFIG } from '../../../config.js'
import { parseJsonResponse } from '../../gemini.js'
import { renderPrompt } from '../../prompt-manager.js'
import { createLogger } from '../../../logger.js'
import type { GraphStateType, ContentBlock, ScreenshotInfo, ContentType } from '../state.js'

const log = createLogger('image-processor:analyze')

// 初始化 Gemini 客户端
const genai = new GoogleGenAI({
  apiKey: GEMINI_CONFIG.apiKey,
  httpOptions: { baseUrl: GEMINI_CONFIG.baseUrl },
})

// 图片最大尺寸
const MAX_IMAGE_SIZE = 1024

/**
 * 压缩图片为 base64
 */
async function compressImageToBase64(imagePath: string): Promise<{ base64: string; mimeType: string }> {
  const image = sharp(imagePath)
  const metadata = await image.metadata()

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

  const buffer = await processed.jpeg({ quality: 80 }).toBuffer()
  return {
    base64: buffer.toString('base64'),
    mimeType: 'image/jpeg',
  }
}

/**
 * 内容分析节点
 */
export async function analyzeNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { content, screenshots, requirements } = state

  log.info('分析内容和截图')

  // 获取截图尺寸信息
  const screenshotDimensions = await Promise.all(
    screenshots.map(async (path, index) => {
      const metadata = await sharp(path).metadata()
      return {
        index,
        width: metadata.width || 0,
        height: metadata.height || 0,
      }
    })
  )

  // 生成 prompt
  const prompt = await renderPrompt('phase1-analyze', {
    content,
    screenshot_count: screenshots.length,
    dimensions: screenshotDimensions,
    requirements,
  })

  // 准备图片
  const parts: any[] = []
  for (const screenshotPath of screenshots) {
    const { base64, mimeType } = await compressImageToBase64(screenshotPath)
    parts.push({ inlineData: { mimeType, data: base64 } })
  }
  parts.push({ text: prompt })

  // 调用 AI
  const response = await genai.models.generateContent({
    model: GEMINI_CONFIG.analysisModel,
    contents: [{ role: 'user', parts }],
  })

  const result = parseJsonResponse<{
    contentBlocks: ContentBlock[]
    screenshots: Omit<ScreenshotInfo, 'path'>[]
    contentType: ContentType
    theme: string
    suggestedStyle: string
  }>(response.text || '')

  // 补充截图路径
  const screenshotAnalysis: ScreenshotInfo[] = result.screenshots.map((s, i) => ({
    ...s,
    path: screenshots[s.index] || screenshots[i],
  }))

  log.info('分析完成', {
    contentBlocks: result.contentBlocks.length,
    screenshots: screenshotAnalysis.length,
    contentType: result.contentType,
    theme: result.theme,
  })

  return {
    contentBlocks: result.contentBlocks,
    screenshotAnalysis,
    contentType: result.contentType,
    theme: result.theme,
    suggestedStyle: result.suggestedStyle,
  }
}
