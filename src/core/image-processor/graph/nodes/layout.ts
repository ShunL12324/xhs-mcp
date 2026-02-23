/**
 * Phase 2: 布局规划节点
 *
 * 输入: contentBlocks, screenshotAnalysis, contentType, theme, style
 * 输出: layoutPlan
 */

import { GoogleGenAI } from '@google/genai';
import { GEMINI_CONFIG, CANVAS_SIZES, COLOR_PALETTES } from '../../../config.js';
import { parseJsonResponse } from '../../gemini.js';
import { renderPrompt } from '../../prompt-manager.js';
import { createLogger } from '../../../logger.js';
import type { GraphStateType, LayoutPlan, PlacementInput } from '../state.js';
import { PLACEMENT_DEFAULTS } from '../state.js';

const log = createLogger('image-processor:layout');

// 初始化 Gemini 客户端
const genai = new GoogleGenAI({
  apiKey: GEMINI_CONFIG.apiKey,
  httpOptions: { baseUrl: GEMINI_CONFIG.baseUrl },
});

/**
 * 布局规划节点
 */
export async function layoutNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { contentBlocks, screenshotAnalysis, contentType, theme, style, suggestedStyle } = state;

  log.info('规划布局');

  const selectedStyle = style || suggestedStyle || 'minimal';
  const palette = COLOR_PALETTES[selectedStyle as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.minimal;

  // 生成 prompt
  const prompt = await renderPrompt('phase2-layout', {
    content_blocks: contentBlocks,
    screenshots: screenshotAnalysis,
    content_type: contentType,
    theme,
    style: selectedStyle,
    palette,
    canvas_sizes: CANVAS_SIZES,
  });

  // 调用 AI
  const response = await genai.models.generateContent({
    model: GEMINI_CONFIG.analysisModel,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  // AI 返回的原始结果（placement 只有 source）
  interface RawLayoutPlan {
    canvas: LayoutPlan['canvas'];
    slides: Array<{
      index: number;
      type: string;
      backgroundColor: string;
      placement: PlacementInput;
      textLayers: any[];
      annotations: any[];
      contentBlockIndex?: number;
    }>;
    colorPalette: LayoutPlan['colorPalette'];
  }

  const rawPlan = parseJsonResponse<RawLayoutPlan>(response.text || '');

  // 填充 placement 默认值
  const layoutPlan: LayoutPlan = {
    ...rawPlan,
    slides: rawPlan.slides.map((slide) => ({
      ...slide,
      type: slide.type as any,
      placement: {
        source: slide.placement.source,
        ...PLACEMENT_DEFAULTS,
      },
    })),
  };

  log.info('布局规划完成', {
    slides: layoutPlan.slides.length,
    canvas: `${layoutPlan.canvas.width}×${layoutPlan.canvas.height}`,
  });

  return {
    layoutPlan,
  };
}
