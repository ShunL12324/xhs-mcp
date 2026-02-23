/**
 * 导入浏览器 cookies 到数据库
 * Usage: bun run scripts/import-cookies.ts
 */
import { Database } from 'bun:sqlite';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// 浏览器导出的 cookies
const browserCookies = [
  {
    domain: '.xiaohongshu.com',
    expirationDate: 1801257614.078434,
    hostOnly: false,
    httpOnly: true,
    name: 'web_session',
    path: '/',
    sameSite: null,
    secure: true,
    session: false,
    storeId: null,
    value: '0400698dd9d8ff0c568864874e3b4b36c7a788',
  },
  {
    domain: '.xiaohongshu.com',
    expirationDate: 1801257614.078562,
    hostOnly: false,
    httpOnly: true,
    name: 'id_token',
    path: '/',
    sameSite: null,
    secure: true,
    session: false,
    storeId: null,
    value:
      'VjEAACPScezlNsVRquAvvQ7i2OeNinpturKgCvESTgc09tysjpSLuUw2gtEclNijp22332nTcE/9hmnD/rVQH5f0xxxMvzzcCRuwduPbttX+dFM1V8Bnepuhqs4oOY06h0fCVCNN',
  },
];

// 转换为 Playwright storage state 格式
function convertToPlaywrightState(cookies: typeof browserCookies) {
  return {
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expirationDate, // Playwright 也用秒级时间戳
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite === null ? 'Lax' : c.sameSite,
    })),
    origins: [],
  };
}

// 主逻辑
const dbPath = join(homedir(), '.xhs-mcp', 'data.db');
console.log('数据库路径:', dbPath);

const db = new Database(dbPath);
const state = convertToPlaywrightState(browserCookies);
console.log('转换后的 state:', JSON.stringify(state, null, 2));

// 检查是否有现有账户
const existing = db.prepare('SELECT id, name FROM accounts').all();
console.log('现有账户:', existing);

const accountName = 'manual-import';
const accountId = `acc_${randomUUID().slice(0, 8)}`;

// 插入或更新
const existingAccount = db.prepare('SELECT id FROM accounts WHERE name = ?').get(accountName);

if (existingAccount) {
  // 更新现有账户
  db.prepare(`
    UPDATE accounts
    SET state = ?, last_login_at = datetime('now'), updated_at = datetime('now')
    WHERE name = ?
  `).run(JSON.stringify(state), accountName);
  console.log(`✅ 已更新账户: ${accountName}`);
} else {
  // 创建新账户
  db.prepare(`
    INSERT INTO accounts (id, name, state, status, created_at, updated_at, last_login_at)
    VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'), datetime('now'))
  `).run(accountId, accountName, JSON.stringify(state));
  console.log(`✅ 已创建账户: ${accountName} (ID: ${accountId})`);
}

// 验证
const account = db.prepare('SELECT id, name, status, state FROM accounts WHERE name = ?').get(accountName) as any;
console.log('账户信息:', {
  id: account.id,
  name: account.name,
  status: account.status,
  cookieCount: JSON.parse(account.state).cookies.length,
});

db.close();
