/**
 * @fileoverview SQLite database schema definitions for xhs-mcp.
 * Defines all tables, indexes, and TypeScript interfaces for database operations.
 * @module db/schema
 */

/**
 * SQL schema for initializing the database.
 * Creates all required tables and indexes if they don't exist.
 */
export const SCHEMA_SQL = `
-- Accounts table: stores registered Xiaohongshu accounts
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  proxy TEXT,
  state JSON,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'banned')),
  last_login_at DATETIME,
  last_active_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Account profile cache: stores user profile information fetched from Xiaohongshu
CREATE TABLE IF NOT EXISTS account_profiles (
  account_id TEXT PRIMARY KEY,
  user_id TEXT,
  red_id TEXT,
  nickname TEXT,
  avatar TEXT,
  description TEXT,
  gender INTEGER,
  followers INTEGER,
  following INTEGER,
  notes_count INTEGER,
  updated_at DATETIME,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Operation logs: tracks all operations performed by accounts
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  params JSON,
  result JSON,
  success BOOLEAN NOT NULL,
  error TEXT,
  duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Published notes: records of content published through this server
CREATE TABLE IF NOT EXISTS published_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  note_id TEXT,
  title TEXT NOT NULL,
  content TEXT,
  note_type TEXT DEFAULT 'image' CHECK(note_type IN ('image', 'video')),
  images JSON,
  video_path TEXT,
  tags JSON,
  status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'scheduled', 'published', 'deleted')),
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Interactions: records of likes, favorites, comments, and replies
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  target_note_id TEXT NOT NULL,
  target_user_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('like', 'unlike', 'favorite', 'unfavorite', 'comment', 'reply')),
  comment_id TEXT,
  comment_content TEXT,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Downloads: records of downloaded images and videos
CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('image', 'video')),
  file_path TEXT NOT NULL,
  original_url TEXT,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Note drafts: AI-generated note drafts for multi-account publishing
CREATE TABLE IF NOT EXISTS note_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSON,
  images JSON,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Config table: key-value store for application configuration
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSON,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_operation_logs_account_id ON operation_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_published_notes_account_id ON published_notes(account_id);
CREATE INDEX IF NOT EXISTS idx_interactions_account_id ON interactions(account_id);
CREATE INDEX IF NOT EXISTS idx_interactions_target_note_id ON interactions(target_note_id);
CREATE INDEX IF NOT EXISTS idx_downloads_note_id ON downloads(note_id);
CREATE INDEX IF NOT EXISTS idx_note_drafts_created_at ON note_drafts(created_at);
`;

// ============================================================================
// TypeScript interfaces matching the database schema
// ============================================================================

/**
 * Raw database row for an account.
 * Maps directly to the accounts table columns.
 */
export interface AccountRow {
  /** UUID primary key */
  id: string;
  /** Human-readable account name (unique) */
  name: string;
  /** Optional proxy server URL */
  proxy: string | null;
  /** Playwright storage state as JSON string */
  state: string | null;
  /** Account status */
  status: 'active' | 'suspended' | 'banned';
  /** Last successful login timestamp */
  last_login_at: string | null;
  /** Last activity timestamp */
  last_active_at: string | null;
  /** Account creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Raw database row for an account profile.
 * Caches user profile information fetched from Xiaohongshu.
 */
export interface AccountProfileRow {
  /** Foreign key to accounts.id */
  account_id: string;
  /** Xiaohongshu user ID */
  user_id: string | null;
  /** Xiaohongshu Red ID (numeric string shown in profile) */
  red_id: string | null;
  /** Display name */
  nickname: string | null;
  /** Avatar image URL */
  avatar: string | null;
  /** User bio/description */
  description: string | null;
  /** Gender (0 = not specified, 1 = male, 2 = female) */
  gender: number | null;
  /** Number of followers */
  followers: number | null;
  /** Number of users being followed */
  following: number | null;
  /** Number of published notes */
  notes_count: number | null;
  /** Last profile update timestamp */
  updated_at: string | null;
}

/**
 * Raw database row for an operation log entry.
 * Tracks all operations performed through the MCP server.
 */
export interface OperationLogRow {
  /** Auto-increment primary key */
  id: number;
  /** Foreign key to accounts.id */
  account_id: string;
  /** Action type (e.g., 'search', 'like', 'publish_content') */
  action: string;
  /** Target resource ID (e.g., note ID, user ID) */
  target_id: string | null;
  /** Operation parameters as JSON string */
  params: string | null;
  /** Operation result as JSON string */
  result: string | null;
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Operation duration in milliseconds */
  duration_ms: number | null;
  /** Operation timestamp */
  created_at: string;
}

/**
 * Raw database row for a published note.
 * Records content published through this server.
 */
export interface PublishedNoteRow {
  /** Auto-increment primary key */
  id: number;
  /** Foreign key to accounts.id */
  account_id: string;
  /** Xiaohongshu note ID (assigned after publishing) */
  note_id: string | null;
  /** Note title */
  title: string;
  /** Note content/description */
  content: string | null;
  /** Note type: image or video */
  note_type: 'image' | 'video';
  /** Image file paths as JSON array */
  images: string | null;
  /** Video file path */
  video_path: string | null;
  /** Tags as JSON array */
  tags: string | null;
  /** Publishing status */
  status: 'draft' | 'scheduled' | 'published' | 'deleted';
  /** Actual publish timestamp */
  published_at: string | null;
  /** Record creation timestamp */
  created_at: string;
}

/**
 * Raw database row for an interaction record.
 * Tracks likes, favorites, comments, and replies.
 */
export interface InteractionRow {
  /** Auto-increment primary key */
  id: number;
  /** Foreign key to accounts.id */
  account_id: string;
  /** Target note ID */
  target_note_id: string;
  /** Target note author's user ID */
  target_user_id: string | null;
  /** Interaction type */
  action: 'like' | 'unlike' | 'favorite' | 'unfavorite' | 'comment' | 'reply';
  /** Comment ID (for comments and replies) */
  comment_id: string | null;
  /** Comment text content */
  comment_content: string | null;
  /** Whether the interaction succeeded */
  success: boolean;
  /** Error message if interaction failed */
  error: string | null;
  /** Interaction timestamp */
  created_at: string;
}

/**
 * Raw database row for a download record.
 * Tracks downloaded images and videos.
 */
export interface DownloadRow {
  /** Auto-increment primary key */
  id: number;
  /** Source note ID */
  note_id: string;
  /** Downloaded file type */
  file_type: 'image' | 'video';
  /** Local file path */
  file_path: string;
  /** Original URL */
  original_url: string | null;
  /** File size in bytes */
  file_size: number | null;
  /** Download timestamp */
  created_at: string;
}

/**
 * Raw database row for a configuration entry.
 * Key-value store for application settings.
 */
export interface ConfigRow {
  /** Configuration key */
  key: string;
  /** Configuration value as JSON string */
  value: string | null;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Raw database row for a note draft.
 * AI-generated drafts for multi-account publishing.
 */
export interface NoteDraftRow {
  /** UUID primary key */
  id: string;
  /** Note title */
  title: string;
  /** Note content/description */
  content: string;
  /** Tags as JSON array */
  tags: string | null;
  /** Image paths as JSON array */
  images: string | null;
  /** Publish timestamp (null = not published) */
  published_at: string | null;
  /** Record creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}
