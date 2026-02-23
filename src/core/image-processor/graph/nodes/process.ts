/**
 * Phase 3: 图片处理节点
 *
 * 输入: layoutPlan, screenshots, outputDir
 * 输出: baseSlides
 */

import sharp from 'sharp';
import { createCanvas } from 'canvas';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../../../logger.js';
import type { GraphStateType, ProcessedSlide, SlideLayout, Position } from '../state.js';

const log = createLogger('image-processor:process');

/**
 * 图片处理节点
 */
export async function processNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { layoutPlan, screenshots, outputDir } = state;

  log.info('处理图片');

  if (!layoutPlan) {
    throw new Error('layoutPlan is required');
  }

  if (!outputDir) {
    throw new Error('outputDir is required');
  }

  const { canvas, slides } = layoutPlan;
  const { width, height } = canvas;

  const baseSlides: ProcessedSlide[] = [];

  for (const slide of slides) {
    const result = await processSlide(slide, screenshots, outputDir, width, height);
    baseSlides.push(result);
  }

  log.info('基础图片生成完成', { count: baseSlides.length });

  return {
    baseSlides,
  };
}

/**
 * 处理单张幻灯片
 */
async function processSlide(
  slide: SlideLayout,
  screenshots: string[],
  outputDir: string,
  canvasWidth: number,
  canvasHeight: number,
): Promise<ProcessedSlide> {
  const { placement, backgroundColor } = slide;

  // 创建画布
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // 填充背景
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 放置截图
  if (placement.source !== 'generate' && typeof placement.source === 'number') {
    const screenshotPath = screenshots[placement.source];
    if (screenshotPath) {
      await placeScreenshot(ctx, screenshotPath, placement, canvasWidth, canvasHeight);
    }
  }

  // 保存中间图片（直接保存到 outputDir）
  const outputPath = join(outputDir, `slide-${slide.index}-base.png`);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);

  return {
    index: slide.index,
    path: outputPath,
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * 放置截图到画布
 */
async function placeScreenshot(
  ctx: any,
  screenshotPath: string,
  placement: SlideLayout['placement'],
  canvasWidth: number,
  canvasHeight: number,
): Promise<void> {
  const { mode, position, padding, borderRadius, shadow } = placement;

  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  let processedImage = sharp(screenshotPath);
  const metadata = await processedImage.metadata();
  const imgWidth = metadata.width || 0;
  const imgHeight = metadata.height || 0;

  let targetWidth: number;
  let targetHeight: number;
  let resizeOptions: sharp.ResizeOptions;

  switch (mode) {
    case 'fill':
      targetWidth = availableWidth;
      targetHeight = availableHeight;
      resizeOptions = { width: targetWidth, height: targetHeight, fit: 'cover' };
      break;

    case 'fit': {
      const scaleX = availableWidth / imgWidth;
      const scaleY = availableHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY);
      targetWidth = Math.round(imgWidth * scale);
      targetHeight = Math.round(imgHeight * scale);
      resizeOptions = { width: targetWidth, height: targetHeight, fit: 'inside' };
      break;
    }

    case 'crop':
      targetWidth = availableWidth;
      targetHeight = availableHeight;
      resizeOptions = { width: targetWidth, height: targetHeight, fit: 'cover' };
      break;

    default:
      targetWidth = availableWidth;
      targetHeight = availableHeight;
      resizeOptions = { width: targetWidth, height: targetHeight, fit: 'inside' };
  }

  // 先 resize
  processedImage = processedImage.resize(resizeOptions);

  // 获取 resize 后的实际尺寸
  const resizedBuffer = await processedImage.png().toBuffer();
  const resizedMeta = await sharp(resizedBuffer).metadata();
  const actualWidth = resizedMeta.width || targetWidth;
  const actualHeight = resizedMeta.height || targetHeight;

  // 更新 targetWidth/targetHeight 为实际尺寸，用于后续位置计算
  targetWidth = actualWidth;
  targetHeight = actualHeight;

  // 应用圆角
  let imageBuffer: Buffer;
  if (borderRadius > 0) {
    const roundedCorners = Buffer.from(
      `<svg><rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" ry="${borderRadius}"/></svg>`,
    );
    imageBuffer = await sharp(resizedBuffer)
      .composite([{ input: roundedCorners, blend: 'dest-in' }])
      .png()
      .toBuffer();
  } else {
    imageBuffer = resizedBuffer;
  }

  // 计算位置
  const { x, y } = calculatePosition(position, canvasWidth, canvasHeight, targetWidth, targetHeight, padding);

  // 绘制阴影
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
  }

  // 绘制图片
  const { loadImage } = await import('canvas');
  const img = await loadImage(imageBuffer);
  ctx.drawImage(img, x, y, targetWidth, targetHeight);

  // 重置阴影
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * 计算位置
 */
function calculatePosition(
  position: Position,
  canvasWidth: number,
  canvasHeight: number,
  itemWidth: number,
  itemHeight: number,
  padding: number,
): { x: number; y: number } {
  let x = padding;
  let y = padding;

  switch (position) {
    case 'center':
      x = (canvasWidth - itemWidth) / 2;
      y = (canvasHeight - itemHeight) / 2;
      break;
    case 'top':
      x = (canvasWidth - itemWidth) / 2;
      y = padding;
      break;
    case 'bottom':
      x = (canvasWidth - itemWidth) / 2;
      y = canvasHeight - itemHeight - padding;
      break;
    case 'left':
      x = padding;
      y = (canvasHeight - itemHeight) / 2;
      break;
    case 'right':
      x = canvasWidth - itemWidth - padding;
      y = (canvasHeight - itemHeight) / 2;
      break;
    case 'top-left':
      x = padding;
      y = padding;
      break;
    case 'top-right':
      x = canvasWidth - itemWidth - padding;
      y = padding;
      break;
    case 'bottom-left':
      x = padding;
      y = canvasHeight - itemHeight - padding;
      break;
    case 'bottom-right':
      x = canvasWidth - itemWidth - padding;
      y = canvasHeight - itemHeight - padding;
      break;
  }

  return { x, y };
}
