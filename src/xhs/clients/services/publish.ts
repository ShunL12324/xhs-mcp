/**
 * @fileoverview Publishing service for BrowserClient.
 * Contains methods for publishing images and videos.
 * @module xhs/clients/services/publish
 */

import { chromium, Page } from 'playwright';
import { PublishContentParams, PublishVideoParams, PublishResult } from '../../types.js';
import { getStealthScript, sleep } from '../../utils/index.js';
import { config } from '../../../core/config.js';
import { BrowserContextManager, log } from '../context.js';
import {
  USER_AGENT,
  BROWSER_ARGS,
  TIMEOUTS,
  PUBLISH_SELECTORS,
  URLS,
} from '../constants.js';

/**
 * Publish service - handles content publishing
 */
export class PublishService {
  constructor(private ctx: BrowserContextManager) {}

  /**
   * Publish an image/text note.
   * Opens a visible browser window for the publishing process.
   *
   * @param params - Publishing parameters
   * @returns Publish result with success status
   */
  async publishContent(params: PublishContentParams): Promise<PublishResult> {
    log.info('Starting publishContent', { title: params.title, imageCount: params.images.length });

    if (!this.ctx.options.state) {
      log.error('Not logged in');
      return { success: false, error: 'Not logged in. Please use xhs_add_account first.' };
    }

    if (this.ctx.browser) {
      log.debug('Closing existing browser instance');
      await this.ctx.browser.close();
    }

    const launchOptions: any = {
      headless: config.browser.headless,  // 发布操作建议使用可见模式 (XHS_MCP_HEADLESS=false)
      args: BROWSER_ARGS,
    };

    if (this.ctx.options.proxy) {
      launchOptions.proxy = { server: this.ctx.options.proxy };
    }

    log.debug('Launching browser for publishing...');
    this.ctx.browser = await chromium.launch(launchOptions);

    const stealthScript = await getStealthScript();

    this.ctx.context = await this.ctx.browser.newContext({
      userAgent: USER_AGENT,
      storageState: this.ctx.options.state,
      viewport: { width: 1920, height: 1080 },
    });

    if (stealthScript) {
      await this.ctx.context.addInitScript(stealthScript);
    }

    const page = await this.ctx.context.newPage();

    try {
      // Navigate to creator publish page (matching Go project URL)
      log.info('Navigating to creator publish page', { url: URLS.PUBLISH });
      await page.goto(URLS.PUBLISH, {
        waitUntil: 'load',
        timeout: TIMEOUTS.PAGE_LOAD,
      });

      // Wait for page to stabilize (matching Go project: WaitLoad + 2 seconds)
      log.debug('Waiting for page to stabilize...');
      await sleep(2000);

      // 等待网络空闲，超时则继续
      try {
        await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE });
      } catch {
        log.warn('Network idle timeout, continuing...');
      }
      await sleep(1000);

      // 检查是否被重定向到登录页面
      const currentUrl = page.url();
      log.debug('Current URL after navigation', { url: currentUrl });

      if (currentUrl.includes('login') || currentUrl.includes('passport')) {
        log.error('Redirected to login page - session invalid');
        return { success: false, error: 'Session expired. Please re-login with xhs_add_account.' };
      }

      // 等待上传内容区域出现
      log.debug('Waiting for upload content area...');
      try {
        await page.waitForSelector('div.upload-content', { timeout: TIMEOUTS.UPLOAD_CONTENT });
        log.debug('Upload content area found');
      } catch (e) {
        log.error('Upload content area not found', { error: e });
        const pageTitle = await page.title();
        log.error('Page info', { title: pageTitle, url: page.url() });
        return { success: false, error: `Publish page not loaded correctly. Title: ${pageTitle}` };
      }

      // Click image upload tab (matching Go project: mustClickPublishTab)
      log.debug('Clicking upload image tab...');
      await this.clickPublishTab(page, '上传图文');
      await sleep(1000);

      // Upload images
      log.debug('Looking for upload input...');
      const uploadInput = await page.$(PUBLISH_SELECTORS.uploadInput);
      if (!uploadInput) {
        log.error('Upload input not found');
        return { success: false, error: 'Upload input not found' };
      }

      // Validate image paths
      const validPaths: string[] = [];
      for (const imgPath of params.images) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(imgPath)) {
            validPaths.push(imgPath);
            log.debug('Valid image path', { path: imgPath });
          } else {
            log.warn('Image file not found', { path: imgPath });
          }
        } catch {
          validPaths.push(imgPath);  // Let Playwright handle the error
        }
      }

      if (validPaths.length === 0) {
        log.error('No valid image paths');
        return { success: false, error: 'No valid image files found' };
      }

      // Set files
      log.info('Uploading images', { count: validPaths.length });
      await uploadInput.setInputFiles(validPaths);

      // Wait for upload complete (matching Go project: waitForUploadComplete)
      log.debug('Waiting for upload complete...');
      await this.waitForUploadComplete(page, validPaths.length);
      await sleep(2000);

      // Fill title
      log.debug('Filling title...');
      const titleInput = await page.$(PUBLISH_SELECTORS.titleInput);
      if (titleInput) {
        await titleInput.fill(params.title);
        log.info('Title set', { title: params.title });
      } else {
        log.warn('Title input not found');
      }

      // Fill content
      log.debug('Filling content...');
      const contentEditor = await page.$(PUBLISH_SELECTORS.contentEditor);
      if (contentEditor) {
        await contentEditor.click();
        await page.keyboard.type(params.content);
        log.info('Content set');
      } else {
        const contentTextbox = await page.$(PUBLISH_SELECTORS.contentTextbox);
        if (contentTextbox) {
          await contentTextbox.click();
          await page.keyboard.type(params.content);
          log.info('Content set (via textbox)');
        } else {
          log.warn('Content editor not found');
        }
      }

      await sleep(1000);

      // Add tags
      if (params.tags && params.tags.length > 0) {
        log.debug('Adding tags', { tags: params.tags });
        for (const tag of params.tags) {
          await page.keyboard.type(`#${tag}`);
          await sleep(500);

          // Wait for and click tag suggestion
          const suggestion = await page.$(`${PUBLISH_SELECTORS.topicContainer}:has-text("${tag}")`);
          if (suggestion) {
            await suggestion.click();
            await sleep(300);
          } else {
            // Press space to confirm tag
            await page.keyboard.press('Space');
          }
          await sleep(300);
        }
        log.info('Tags added');
      }

      // Handle scheduled publish
      if (params.scheduleTime) {
        log.debug('Setting schedule time', { time: params.scheduleTime });
        const scheduleRadio = await page.$(PUBLISH_SELECTORS.scheduleRadio);
        if (scheduleRadio) {
          await scheduleRadio.click();
          await sleep(500);
          log.warn('Schedule time selection not fully implemented', { time: params.scheduleTime });
        }
      }

      // Click publish button
      log.info('Clicking publish button...');
      const publishBtn = await page.$(PUBLISH_SELECTORS.publishBtn);
      if (!publishBtn) {
        log.error('Publish button not found');
        return { success: false, error: 'Publish button not found' };
      }

      await publishBtn.click();
      log.info('Publish button clicked');

      // Wait for publish to complete
      await sleep(3000);

      // Check if publish succeeded
      const resultUrl = page.url();
      log.debug('Result URL', { url: resultUrl });

      if (resultUrl.includes('success') || resultUrl.includes('publish')) {
        // Try to extract note ID from URL
        const noteIdMatch = resultUrl.match(/note\/([a-zA-Z0-9]+)/);
        log.info('Publish successful', { noteId: noteIdMatch?.[1] });
        return {
          success: true,
          noteId: noteIdMatch?.[1],
        };
      }

      log.info('Publish completed');
      return { success: true };
    } catch (error) {
      log.error('Publish failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Keep browser open briefly for user to see result
      await sleep(2000);
      await page.close();
      log.debug('Browser page closed');
    }
  }

  /**
   * Click publish tab (matching Go project: mustClickPublishTab)
   */
  private async clickPublishTab(page: Page, tabName: string): Promise<void> {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      const tabs = await page.$$('div.creator-tab');

      for (const tab of tabs) {
        const text = await tab.textContent();
        if (text?.trim() === tabName) {
          // Check if tab is blocked by overlay
          const isBlocked = await tab.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return true;
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const target = document.elementFromPoint(x, y);
            return !(target === el || el.contains(target));
          });

          if (isBlocked) {
            log.debug('Tab is blocked, trying to remove overlay...');
            // Try to click empty area to dismiss popover
            await page.mouse.click(400, 50);
            await sleep(200);
            continue;
          }

          await tab.click();
          log.debug('Clicked publish tab', { tabName });
          return;
        }
      }

      await sleep(200);
    }

    log.warn('Publish tab not found', { tabName });
  }

  /**
   * 等待图片上传完成
   *
   * 通过检测上传预览区域的图片数量来判断上传是否完成。
   *
   * @param page - Playwright 页面实例
   * @param expectedCount - 期望上传的图片数量
   */
  private async waitForUploadComplete(page: Page, expectedCount: number): Promise<void> {
    const checkInterval = 500;
    const startTime = Date.now();

    log.debug('Waiting for upload complete', { expectedCount });

    while (Date.now() - startTime < TIMEOUTS.IMAGE_UPLOAD) {
      // 检查已上传的图片数量
      const uploadedImages = await page.$$('.img-preview-area .pr');
      const currentCount = uploadedImages.length;

      log.debug('Upload progress', { current: currentCount, expected: expectedCount });

      if (currentCount >= expectedCount) {
        log.info('All images uploaded', { count: currentCount });
        return;
      }

      await sleep(checkInterval);
    }

    log.warn('Upload timeout, continuing anyway');
  }

  /**
   * Publish a video note.
   * Opens a visible browser window for the publishing process.
   *
   * @param params - Publishing parameters
   * @returns Publish result with success status
   */
  async publishVideo(params: PublishVideoParams): Promise<PublishResult> {
    if (!this.ctx.options.state) {
      return { success: false, error: 'Not logged in. Please use xhs_login first.' };
    }

    if (this.ctx.browser) {
      await this.ctx.browser.close();
    }

    const launchOptions: any = {
      headless: config.browser.headless,  // 可通过 XHS_MCP_HEADLESS 控制
      args: BROWSER_ARGS,
    };

    if (this.ctx.options.proxy) {
      launchOptions.proxy = { server: this.ctx.options.proxy };
    }

    this.ctx.browser = await chromium.launch(launchOptions);

    const stealthScript = await getStealthScript();

    this.ctx.context = await this.ctx.browser.newContext({
      userAgent: USER_AGENT,
      storageState: this.ctx.options.state,
      viewport: { width: 1920, height: 1080 },
    });

    if (stealthScript) {
      await this.ctx.context.addInitScript(stealthScript);
    }

    const page = await this.ctx.context.newPage();

    try {
      await page.goto('https://creator.xiaohongshu.com/publish/publish', {
        waitUntil: 'domcontentloaded',
      });

      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(2000);

      // 点击"上传视频"标签
      const videoTab = await page.$(PUBLISH_SELECTORS.uploadVideoTab);
      if (videoTab) {
        await videoTab.click();
        await sleep(1000);
      }

      // 上传视频
      const uploadInput = await page.$(PUBLISH_SELECTORS.uploadInput);
      if (!uploadInput) {
        return { success: false, error: 'Upload input not found' };
      }

      await uploadInput.setInputFiles(params.videoPath);
      log.info('Uploading video', { path: params.videoPath });

      // 等待视频上传和处理（视频处理需要较长时间）
      await page.waitForSelector('.upload-success, .video-preview, .cover-container', {
        timeout: TIMEOUTS.VIDEO_UPLOAD,
      });
      await sleep(2000);

      // 如果提供了封面图，上传封面
      if (params.coverPath) {
        const coverInput = await page.$('.cover-upload input, [class*="cover"] input[type="file"]');
        if (coverInput) {
          await coverInput.setInputFiles(params.coverPath);
          await sleep(2000);
        }
      }

      // 填写标题
      const titleInput = await page.$(PUBLISH_SELECTORS.titleInput);
      if (titleInput) {
        await titleInput.fill(params.title);
      }

      // 填写内容
      const contentEditor = await page.$(PUBLISH_SELECTORS.contentEditor);
      if (contentEditor) {
        await contentEditor.click();
        await page.keyboard.type(params.content);
      }

      await sleep(1000);

      // 添加标签
      if (params.tags && params.tags.length > 0) {
        for (const tag of params.tags) {
          await page.keyboard.type(`#${tag}`);
          await sleep(500);
          const suggestion = await page.$(`${PUBLISH_SELECTORS.topicContainer}:has-text("${tag}")`);
          if (suggestion) {
            await suggestion.click();
          } else {
            await page.keyboard.press('Space');
          }
          await sleep(300);
        }
      }

      // 点击发布
      const publishBtn = await page.$(PUBLISH_SELECTORS.publishBtn);
      if (!publishBtn) {
        return { success: false, error: 'Publish button not found' };
      }

      await publishBtn.click();
      await sleep(3000);

      return { success: true };
    } catch (error) {
      log.error('Video publish failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await sleep(2000);
      await page.close();
    }
  }
}
