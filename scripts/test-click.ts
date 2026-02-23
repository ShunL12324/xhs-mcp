/**
 * 测试点击 note card 打开 modal
 * 运行: npx tsx scripts/test-click.ts
 */

import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';

const NOTE_ID = '697ce5770000000021030f02';

async function main() {
  // 读取账户 cookies
  const dbPath = path.join(os.homedir(), '.xhs-mcp', 'data.db');
  const db = new Database(dbPath);
  const account = db.prepare("SELECT * FROM accounts WHERE name = ?").get('ls12324-DEV') as any;
  db.close();

  if (!account || !account.state) {
    console.error('Account not found or no state');
    return;
  }

  const state = JSON.parse(account.state);

  // 启动浏览器
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: state,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  console.log('Navigating to explore page...');
  await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 查找卡片
  const cardSelector = `section.note-item a[href*="/explore/${NOTE_ID}"]`;
  console.log('Looking for card:', cardSelector);

  const card = await page.$(cardSelector);
  if (!card) {
    console.error('Card not found! Trying alternative selectors...');

    // 尝试其他选择器
    const allCards = await page.$$('section.note-item a');
    console.log('Total note cards found:', allCards.length);

    for (const c of allCards.slice(0, 5)) {
      const href = await c.getAttribute('href');
      console.log('  - href:', href);
    }

    await page.waitForTimeout(60000);
    await browser.close();
    return;
  }

  console.log('Card found! Testing click methods...');

  // 方法 1: Playwright click
  console.log('\n--- Method 1: Playwright click() ---');
  try {
    await card.click();
    await page.waitForTimeout(2000);

    const modal = await page.$('#noteContainer');
    console.log('Modal appeared:', !!modal);

    if (modal) {
      // 关闭 modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.error('Method 1 failed:', e);
  }

  // 重新获取卡片
  const card2 = await page.$(cardSelector);
  if (!card2) {
    console.log('Card no longer visible');
    await page.waitForTimeout(60000);
    await browser.close();
    return;
  }

  // 方法 2: dispatchEvent MouseEvent
  console.log('\n--- Method 2: dispatchEvent MouseEvent ---');
  try {
    await card2.evaluate(el => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(2000);

    const modal = await page.$('#noteContainer');
    console.log('Modal appeared:', !!modal);

    if (modal) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.error('Method 2 failed:', e);
  }

  // 方法 3: 直接导航
  console.log('\n--- Method 3: page.goto ---');
  try {
    await page.goto(`https://www.xiaohongshu.com/explore/${NOTE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const modal = await page.$('#noteContainer');
    console.log('Modal/content appeared:', !!modal);
  } catch (e) {
    console.error('Method 3 failed:', e);
  }

  console.log('\nKeeping browser open for inspection...');
  await page.waitForTimeout(60000);
  await browser.close();
}

main().catch(console.error);
