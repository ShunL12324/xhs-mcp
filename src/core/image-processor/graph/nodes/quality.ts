/**
 * Phase 5: 质量检查节点
 *
 * 输入: beautifiedSlides, content
 * 输出: qualityReport
 */

import { GoogleGenAI } from '@google/genai'
import { readFileSync } from 'fs'
import sharp from 'sharp'
import { GEMINI_CONFIG } from '../../../config.js'
import { parseJsonResponse } from '../../gemini.js'
import { renderPrompt } from '../../prompt-manager.js'
import { createLogger } from '../../../logger.js'
import type { GraphStateType, QualityReport } from '../state.js'

const log = createLogger('image-processor:quality')

// 初始化 Gemini 客户端
const genai = new GoogleGenAI({
  apiKey: GEMINI_CONFIG.apiKey,
  httpOptions: { baseUrl: GEMINI_CONFIG.baseUrl },
})

/**
 * 质量检查节点
 */
export async function qualityNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { beautifiedSlides, content } = state

  log.info('质量检查')

  if (!beautifiedSlides) {
    throw new Error('beautifiedSlides is required')
  }

  // 准备图片
  const parts: any[] = []
  for (const slide of beautifiedSlides) {
    const imageBuffer = readFileSync(slide.path)
    const compressedBuffer = await sharp(imageBuffer)
      .resize({ width: 512, height: 512, fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer()

    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: compressedBuffer.toString('base64'),
      },
    })
  }

  // 生成 prompt
  const prompt = await renderPrompt('phase5-quality', {
    content,
    slide_count: beautifiedSlides.length,
  })

  parts.push({ text: prompt })

  // 调用 AI
  const response = await genai.models.generateContent({
    model: GEMINI_CONFIG.analysisModel,
    contents: [{ role: 'user', parts }],
  })

  const result = parseJsonResponse<{
    overallPassed: boolean
    issues: string[]
    summary: string
  }>(response.text || '')

  const qualityReport: QualityReport = {
    overallPassed: result.overallPassed,
    issues: result.issues || [],
    summary: result.summary,
  }

  log.info('质量评估完成', {
    passed: qualityReport.overallPassed,
    summary: qualityReport.summary,
  })

  return {
    qualityReport,
  }
}
