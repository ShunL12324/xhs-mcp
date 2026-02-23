/**
 * 数据库迁移脚本 - 添加 explore 相关表
 * 运行: npx tsx scripts/migrate-explore.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const dbPath = path.join(os.homedir(), '.xhs-mcp', 'data.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

const migrations = [
  // explore_sessions 表
  `CREATE TABLE IF NOT EXISTS explore_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    config JSON,
    notes_seen INTEGER DEFAULT 0,
    notes_opened INTEGER DEFAULT 0,
    notes_liked INTEGER DEFAULT 0,
    notes_commented INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running' CHECK(status IN ('running', 'completed', 'stopped')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,

  // explore_logs 表
  `CREATE TABLE IF NOT EXISTS explore_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    note_id TEXT NOT NULL,
    note_title TEXT,
    action TEXT NOT NULL CHECK(action IN ('seen', 'opened', 'liked', 'commented')),
    content TEXT,
    ai_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES explore_sessions(id) ON DELETE CASCADE
  )`,

  // explored_notes 表
  `CREATE TABLE IF NOT EXISTS explored_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL,
    note_id TEXT NOT NULL,
    explored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    interacted INTEGER DEFAULT 0,
    UNIQUE(account_id, note_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,

  // 索引
  `CREATE INDEX IF NOT EXISTS idx_explore_sessions_account_id ON explore_sessions(account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_explore_logs_session_id ON explore_logs(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_explored_notes_account_id ON explored_notes(account_id)`,
];

console.log('Running migrations...');

for (const sql of migrations) {
  try {
    db.exec(sql);
    // 提取表名或索引名
    const match = sql.match(/(?:CREATE TABLE|CREATE INDEX)[^`]*?(\w+)/i);
    console.log('✓', match ? match[1] : 'SQL executed');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('- Already exists, skipping');
    } else {
      console.error('✗ Error:', e.message);
    }
  }
}

db.close();
console.log('Migration completed!');
