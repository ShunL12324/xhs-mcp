/**
 * Phase 4: AI 美化节点
 *
 * 输入: baseSlides, layoutPlan, sessionId
 * 输出: beautifiedSlides
 */

import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';
import { GEMINI_CONFIG } from '../../../config.js';
import { renderPrompt } from '../../prompt-manager.js';
import { createLogger } from '../../../logger.js';
import type { GraphStateType, ProcessedSlide, SlideLayout, Position } from '../state.js';

const log = createLogger('image-processor:beautify');

// 初始化 Gemini 客户端
const genai = new GoogleGenAI({
  apiKey: GEMINI_CONFIG.apiKey,
  httpOptions: { baseUrl: GEMINI_CONFIG.baseUrl },
});

/**
 * 美化节点
 */
export async function beautifyNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { baseSlides, layoutPlan } = state;

  log.info('AI 美化');

  if (!baseSlides || !layoutPlan) {
    throw new Error('baseSlides and layoutPlan are required');
  }

  const beautifiedSlides: ProcessedSlide[] = [];
  let previousBeautifiedPath: string | null = null; // 前一张美化后的图片路径

  for (const baseSlide of baseSlides) {
    const slideLayout = layoutPlan.slides.find((s) => s.index === baseSlide.index);
    if (!slideLayout) {
      beautifiedSlides.push(baseSlide);
      continue;
    }

    // 传入前一张图片作为风格参考
    const result = await beautifySlide(baseSlide, slideLayout, previousBeautifiedPath);
    beautifiedSlides.push(result);

    // 更新参考图片路径（只有成功美化的才作为参考）
    if (result.path !== baseSlide.path.replace('-base.png', '.png') || result.path.endsWith('.png')) {
      previousBeautifiedPath = result.path;
    }
  }

  log.info('美化完成', { count: beautifiedSlides.length });

  return {
    beautifiedSlides,
  };
}

/**
 * 美化单张图片
 * @param previousImagePath 前一张美化后的图片路径，用于保持风格一致性
 */
async function beautifySlide(
  baseSlide: ProcessedSlide,
  slideLayout: SlideLayout,
  previousImagePath: string | null = null,
): Promise<ProcessedSlide> {
  const { textLayers, annotations, type: slideType } = slideLayout;

  // 如果没有文字和标注，直接返回原图
  if (textLayers.length === 0 && annotations.length === 0) {
    const finalPath = baseSlide.path.replace('-base.png', '.png');
    const buffer = readFileSync(baseSlide.path);
    writeFileSync(finalPath, buffer);
    return { ...baseSlide, path: finalPath };
  }

  // 读取并压缩当前图片
  const imageBuffer = readFileSync(baseSlide.path);
  const compressedBuffer = await sharp(imageBuffer)
    .resize({ width: 1024, height: 1024, fit: 'inside' })
    .jpeg({ quality: 85 })
    .toBuffer();

  const base64Image = compressedBuffer.toString('base64');

  // 准备参考图片（如果有前一张图片）
  let referenceImageBase64: string | null = null;
  if (previousImagePath) {
    try {
      const refBuffer = readFileSync(previousImagePath);
      const compressedRef = await sharp(refBuffer)
        .resize({ width: 512, height: 512, fit: 'inside' }) // 参考图可以更小
        .jpeg({ quality: 70 })
        .toBuffer();
      referenceImageBase64 = compressedRef.toString('base64');
    } catch {
      // 参考图读取失败，忽略
    }
  }

  // 构建文字描述
  const textDescriptions = textLayers.map((t) => {
    let desc = `"${t.content}"`;
    if (t.style === 'title') desc += '（大标题，醒目，粗体）';
    else if (t.style === 'subtitle') desc += '（副标题，中等大小）';
    else if (t.style === 'body') desc += '（正文，适合阅读）';
    else if (t.style === 'badge') desc += `（徽章样式，背景色 ${t.backgroundColor || '主题色'}，白色文字）`;
    else if (t.style === 'step-number') desc += '（步骤编号，圆形背景）';
    else if (t.style === 'caption') desc += '（说明文字，较小字号）';
    else if (t.style === 'bullet') desc += '（列表项，带符号）';

    desc += ` 放在 ${positionToChinese(t.position)}`;
    if (t.color) desc += `，文字颜色 ${t.color}`;
    return desc;
  });

  // 构建标注描述
  const annotationDescriptions = annotations.map((a) => {
    let desc = '';
    if (a.type === 'circle') desc = '用红色圆圈';
    else if (a.type === 'arrow') desc = '用红色箭头';
    else if (a.type === 'box') desc = '用红色方框';
    else if (a.type === 'underline') desc = '用红色下划线';

    if (a.target.type === 'text-match') {
      desc += `标注图片中的 "${a.target.text}" 文字位置`;
    } else {
      desc += `在相对位置 (${Math.round(a.target.x * 100)}%, ${Math.round(a.target.y * 100)}%) 处标注`;
    }

    if (a.label) desc += `，旁边添加标签文字 "${a.label}"`;
    if (a.color) desc += `，使用颜色 ${a.color}`;
    return desc;
  });

  // 生成 prompt
  const prompt = await renderPrompt('phase4-beautify', {
    slide_type: slideType,
    text_descriptions: textDescriptions,
    annotation_descriptions: annotationDescriptions,
    has_reference: !!referenceImageBase64, // 是否有参考图
  });

  try {
    // 构建请求内容
    const parts: any[] = [];

    // 如果有参考图片，先放参考图（用于风格一致性）
    if (referenceImageBase64) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64 } });
    }

    // 当前要处理的图片
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });

    // 提示词
    parts.push({ text: prompt });

    const response = await genai.models.generateContent({
      model: GEMINI_CONFIG.imageModel,
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseModalities: ['image', 'text'],
      } as any,
    });

    // 提取生成的图片
    const responseParts = response.candidates?.[0]?.content?.parts || [];
    let outputBuffer: Buffer | null = null;

    for (const part of responseParts) {
      if ((part as any).inlineData?.data) {
        const imageData = (part as any).inlineData.data;
        outputBuffer = Buffer.from(imageData, 'base64');
        break;
      }
    }

    if (!outputBuffer) {
      log.warn('AI 没有返回图片，使用原图', { slide: baseSlide.index });
      const finalPath = baseSlide.path.replace('-base.png', '.png');
      const buffer = readFileSync(baseSlide.path);
      writeFileSync(finalPath, buffer);
      return { ...baseSlide, path: finalPath };
    }

    // 恢复到原始尺寸
    const finalBuffer = await sharp(outputBuffer)
      .resize({ width: baseSlide.width, height: baseSlide.height, fit: 'fill' })
      .png()
      .toBuffer();

    // 保存最终图片
    const finalPath = baseSlide.path.replace('-base.png', '.png');
    writeFileSync(finalPath, finalBuffer);

    const typeLabel = { cover: '封面', screenshot: '截图', 'text-only': '文字', summary: '总结' }[slideType];
    log.debug('单张美化完成', { slide: baseSlide.index, type: typeLabel });

    return {
      ...baseSlide,
      path: finalPath,
    };
  } catch (error: any) {
    log.warn('AI 美化失败，使用原图', { slide: baseSlide.index, error: error.message });
    const finalPath = baseSlide.path.replace('-base.png', '.png');
    const buffer = readFileSync(baseSlide.path);
    writeFileSync(finalPath, buffer);
    return { ...baseSlide, path: finalPath };
  }
}

/**
 * 位置转中文描述
 */
function positionToChinese(position: Position): string {
  const map: Record<string, string> = {
    center: '图片中央',
    top: '图片顶部居中',
    bottom: '图片底部居中',
    left: '图片左侧居中',
    right: '图片右侧居中',
    'top-left': '图片左上角',
    'top-right': '图片右上角',
    'bottom-left': '图片左下角',
    'bottom-right': '图片右下角',
  };
  return map[position] || position;
}
