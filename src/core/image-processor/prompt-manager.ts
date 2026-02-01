/**
 * Prompt 模板管理器 - 使用 LiquidJS (类似 Jinja2)
 */

import { Liquid } from 'liquidjs'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPTS_DIR = join(__dirname, 'prompts')

// 初始化 Liquid 引擎
const engine = new Liquid({
  root: PROMPTS_DIR,
  extname: '.txt',
})

// 添加 json 过滤器
engine.registerFilter('json', (value: any) => JSON.stringify(value, null, 2))

/**
 * 渲染 prompt 模板
 */
export async function renderPrompt(
  templateName: string,
  variables: Record<string, any>
): Promise<string> {
  const templatePath = join(PROMPTS_DIR, `${templateName}.txt`)
  const template = readFileSync(templatePath, 'utf-8')
  return engine.parseAndRender(template, variables)
}

/**
 * Phase 1: 分析截图 prompt
 */
export async function getAnalyzePrompt(
  topic: string,
  requirements: string | undefined,
  dimensions: Array<{ index: number; width: number; height: number }>
): Promise<string> {
  return renderPrompt('phase1-analyze', {
    topic,
    requirements,
    screenshot_count: dimensions.length,
    dimensions,
  })
}

/**
 * Phase 2: 布局规划 prompt
 */
export async function getLayoutPrompt(
  analysis: any,
  style: string,
  palette: any,
  canvasSizes: any
): Promise<string> {
  return renderPrompt('phase2-layout', {
    analysis,
    style,
    palette,
    canvas_sizes: canvasSizes,
  })
}

import type { SlideType } from './graph/state.js'

/**
 * Phase 4: 美化 prompt
 * @param slideType 图片类型: cover(封面) / screenshot(截图) / text-only(纯文字) / summary(总结)
 */
export async function getBeautifyPrompt(
  textDescriptions: string[],
  annotationDescriptions: string[],
  slideType: SlideType = 'screenshot'
): Promise<string> {
  return renderPrompt('phase4-beautify', {
    text_descriptions: textDescriptions,
    annotation_descriptions: annotationDescriptions,
    slide_type: slideType,
  })
}

/**
 * Phase 5: 质量检查 prompt
 */
export async function getQualityPrompt(
  topic: string,
  slideCount: number
): Promise<string> {
  return renderPrompt('phase5-quality', {
    topic,
    slide_count: slideCount,
  })
}
