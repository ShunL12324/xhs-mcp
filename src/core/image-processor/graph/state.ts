/**
 * LangGraph 状态定义
 */

import { Annotation } from '@langchain/langgraph'

// ============ 内容块类型 ============

export type ContentBlockType = 'intro' | 'step' | 'point' | 'tip' | 'warning' | 'conclusion'

export interface ContentBlock {
  type: ContentBlockType
  title?: string              // 块标题（如 "Step 1"）
  text: string                // 块内容
  screenshotIndex?: number    // 关联的截图索引（AI 匹配后填充）
  needsImage: boolean         // 是否需要为此块生成图片
}

// ============ 截图分析 ============

export interface ScreenshotInfo {
  index: number
  path: string
  content: string             // 截图内容描述
  keyElements: string[]       // 关键元素
  matchedBlockIndex?: number  // 匹配的内容块索引
}

// ============ 布局规划 ============

export type SlideType = 'cover' | 'screenshot' | 'text-only' | 'summary'
export type ContentType = 'tutorial' | 'sharing' | 'review' | 'list' | 'story'
export type Position = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type TextStyle = 'title' | 'subtitle' | 'body' | 'badge' | 'step-number' | 'caption' | 'bullet'

export interface TextLayer {
  content: string
  position: Position
  style: TextStyle
  color: string
  backgroundColor?: string
}

export interface AnnotationConfig {
  type: 'circle' | 'arrow' | 'box' | 'underline'
  target: { type: 'text-match'; text: string } | { type: 'coordinates'; x: number; y: number }
  color: string
  label?: string
}

// AI 输出的 placement（只需要 source）
export interface PlacementInput {
  source: number | 'generate'
}

// 完整的 placement（带默认值）
export interface Placement extends PlacementInput {
  mode: 'fill' | 'fit' | 'crop'
  position: Position
  padding: number
  borderRadius: number
  shadow: boolean
}

// 固定的 placement 默认值
export const PLACEMENT_DEFAULTS: Omit<Placement, 'source'> = {
  mode: 'fit',
  position: 'center',
  padding: 60,
  borderRadius: 16,
  shadow: true,
}

export interface SlideLayout {
  index: number
  type: SlideType
  backgroundColor: string
  placement: Placement
  textLayers: TextLayer[]
  annotations: AnnotationConfig[]
  contentBlockIndex?: number  // 关联的内容块索引
}

export interface LayoutPlan {
  canvas: {
    ratio: '1:1' | '3:4' | '4:3'
    width: number
    height: number
  }
  slides: SlideLayout[]
  colorPalette: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
  }
}

// ============ 处理结果 ============

export interface ProcessedSlide {
  index: number
  path: string
  width: number
  height: number
}

// ============ 质量报告 ============

export interface QualityReport {
  overallPassed: boolean
  issues: string[]
  summary: string
}

// ============ Graph 状态 ============

export const GraphState = Annotation.Root({
  // 输入参数
  content: Annotation<string>(),                     // Markdown 笔记内容
  screenshots: Annotation<string[]>(),               // 截图路径列表
  style: Annotation<string | undefined>(),           // 视觉风格
  requirements: Annotation<string | undefined>(),    // 额外要求
  outputDir: Annotation<string | undefined>(),       // 输出目录（可选，默认使用 drafts/{sessionId}）

  // Phase 1: 内容分析输出
  contentBlocks: Annotation<ContentBlock[] | undefined>(),
  screenshotAnalysis: Annotation<ScreenshotInfo[] | undefined>(),
  contentType: Annotation<ContentType | undefined>(),
  theme: Annotation<string | undefined>(),
  suggestedStyle: Annotation<string | undefined>(),

  // Phase 2: 布局规划输出
  layoutPlan: Annotation<LayoutPlan | undefined>(),

  // Phase 3: 图片处理输出
  baseSlides: Annotation<ProcessedSlide[] | undefined>(),

  // Phase 4: 美化输出
  beautifiedSlides: Annotation<ProcessedSlide[] | undefined>(),

  // Phase 5: 质量检查输出
  qualityReport: Annotation<QualityReport | undefined>(),

  // 控制状态
  sessionId: Annotation<string>(),
  retryCount: Annotation<number>(),
  maxRetries: Annotation<number>(),
  error: Annotation<string | undefined>(),
})

export type GraphStateType = typeof GraphState.State
