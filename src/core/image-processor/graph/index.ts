/**
 * LangGraph 工作流定义
 */

import { StateGraph, END } from '@langchain/langgraph';
import { randomUUID } from 'crypto';
import { rmSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { GraphState, type GraphStateType } from './state.js';
import { analyzeNode, layoutNode, processNode, beautifyNode, qualityNode } from './nodes/index.js';
import { paths } from '../../config.js';
import { createLogger } from '../../logger.js';

const log = createLogger('image-processor:graph');

// 最大重试次数
const DEFAULT_MAX_RETRIES = 3;

/**
 * 决定是否重试
 */
function shouldRetry(state: GraphStateType): 'layout' | 'end' {
  const { qualityReport, retryCount, maxRetries } = state;

  // 如果通过或达到最大重试次数，结束
  if (qualityReport?.overallPassed || retryCount >= maxRetries) {
    return 'end';
  }

  // 否则重试（从 layout 开始）
  log.info('重试中', { attempt: retryCount + 1 });
  return 'layout';
}

/**
 * 增加重试计数
 */
function incrementRetry(state: GraphStateType): Partial<GraphStateType> {
  return {
    retryCount: state.retryCount + 1,
  };
}

/**
 * 创建工作流图
 * 使用方法链来保持类型推断
 */
export function createGraph() {
  // 使用方法链以获得正确的类型推断
  const builder = new StateGraph(GraphState)
    .addNode('analyze', analyzeNode)
    .addNode('layout', layoutNode)
    .addNode('process', processNode)
    .addNode('beautify', beautifyNode)
    .addNode('quality', qualityNode)
    .addNode('increment_retry', incrementRetry)
    .addEdge('__start__', 'analyze')
    .addEdge('analyze', 'layout')
    .addEdge('layout', 'process')
    .addEdge('process', 'beautify')
    .addEdge('beautify', 'quality')
    .addConditionalEdges('quality', shouldRetry, {
      layout: 'increment_retry',
      end: END,
    })
    .addEdge('increment_retry', 'layout');

  return builder.compile();
}

/**
 * 处理输入接口
 */
export interface ProcessInput {
  content: string; // Markdown 笔记内容
  screenshots: string[]; // 截图路径列表
  style?: string; // 视觉风格
  requirements?: string; // 额外要求
  maxRetries?: number; // 最大重试次数
  outputDir?: string; // 输出目录（可选，默认生成）
}

/**
 * 处理输出接口
 */
export interface ProcessOutput {
  success: boolean;
  images: string[];
  retryCount: number;
  qualityReport: GraphStateType['qualityReport'];
  outputDir: string; // 实际使用的输出目录
}

/**
 * 清理临时文件（*-base.png）
 */
function cleanupTempFiles(outputDir: string): void {
  if (!existsSync(outputDir)) return;

  try {
    const files = readdirSync(outputDir);
    for (const file of files) {
      if (file.endsWith('-base.png')) {
        unlinkSync(join(outputDir, file));
      }
    }
  } catch (e) {
    // 清理失败不影响主流程
    log.warn('清理临时文件失败', { error: e });
  }
}

/**
 * 运行工作流
 */
export async function runGraph(input: ProcessInput): Promise<ProcessOutput> {
  const graph = createGraph();

  const sessionId = randomUUID();
  // 使用传入的 outputDir 或默认生成
  const outputDir = input.outputDir || paths.getDraftOutputPath(sessionId);

  log.info('开始处理', { sessionId, screenshotCount: input.screenshots.length, outputDir });

  // 初始状态
  const initialState: Partial<GraphStateType> = {
    content: input.content,
    screenshots: input.screenshots,
    style: input.style,
    requirements: input.requirements,
    outputDir,
    sessionId,
    retryCount: 0,
    maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES,
  };

  try {
    // 运行图
    const result = await graph.invoke(initialState);

    let images = result.beautifiedSlides?.map((s: any) => s.path) || [];

    // 如果有建议的顺序，重新排序图片
    if (result.qualityReport?.suggestedOrder && result.qualityReport.suggestedOrder.length === images.length) {
      const reordered = result.qualityReport.suggestedOrder.map((idx: number) => images[idx]);
      log.info('根据建议顺序重新排序图片', {
        original: images.map((_, i) => i),
        suggested: result.qualityReport.suggestedOrder,
      });
      images = reordered;
    }

    // 清理临时文件
    cleanupTempFiles(outputDir);

    log.info('处理完成', { outputDir, imageCount: images.length });

    return {
      success: result.qualityReport?.overallPassed ?? false,
      images,
      retryCount: result.retryCount,
      qualityReport: result.qualityReport,
      outputDir,
    };
  } catch (error) {
    // 处理失败时清理输出目录
    log.error('处理失败', { error });

    if (existsSync(outputDir)) {
      try {
        rmSync(outputDir, { recursive: true });
        log.info('已清理输出目录', { outputDir });
      } catch (e) {
        log.warn('清理输出目录失败', { error: e });
      }
    }

    throw error;
  }
}

// 导出状态类型
export type { GraphStateType } from './state.js';
