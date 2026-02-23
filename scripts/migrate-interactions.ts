/**
 * 迁移 interactions 表，更新 CHECK 约束以支持 like_comment 和 unlike_comment
 */
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const dbPath = path.join(os.homedir(), '.xhs-mcp', 'data.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// 开始事务
db.exec('BEGIN TRANSACTION');

try {
  // 1. 创建新表（带新的 CHECK 约束）
  db.exec(`
    CREATE TABLE IF NOT EXISTS interactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      target_note_id TEXT NOT NULL,
      target_user_id TEXT,
      action TEXT NOT NULL CHECK(action IN ('like', 'unlike', 'favorite', 'unfavorite', 'comment', 'reply', 'like_comment', 'unlike_comment')),
      comment_id TEXT,
      comment_content TEXT,
      success BOOLEAN NOT NULL,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);
  console.log('Created new table');

  // 2. 复制数据
  db.exec('INSERT INTO interactions_new SELECT * FROM interactions');
  console.log('Copied data');

  // 3. 删除旧表
  db.exec('DROP TABLE interactions');
  console.log('Dropped old table');

  // 4. 重命名新表
  db.exec('ALTER TABLE interactions_new RENAME TO interactions');
  console.log('Renamed new table');

  // 提交事务
  db.exec('COMMIT');

  console.log('Migration completed successfully!');
} catch (e: any) {
  db.exec('ROLLBACK');
  console.error('Migration failed:', e.message);
  process.exit(1);
}

db.close();
