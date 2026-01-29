/**
 * @fileoverview Type definitions for Xiaohongshu data structures.
 * Contains interfaces for notes, comments, users, and API responses.
 * @module xhs/types
 */

// ============================================================================
// Comment Types
// ============================================================================

/**
 * A comment on a Xiaohongshu note.
 */
export interface XhsComment {
  /** Comment ID */
  id: string;
  /** Comment text content */
  content: string;
  /** Number of likes on this comment */
  likeCount: string;
  /** Comment creation timestamp (Unix milliseconds) */
  createTime: number;
  /** IP location of the commenter */
  ipLocation?: string;
  /** Commenter's user information */
  user: {
    nickname: string;
    avatar: string;
    userid: string;
  };
  /** Number of replies to this comment */
  subCommentCount?: string;
  /** Replies to this comment (if loaded) */
  subComments?: XhsComment[];
}

/**
 * Paginated list of comments.
 */
export interface XhsCommentList {
  /** Comments in the current page */
  list: XhsComment[];
  /** Cursor for loading more comments */
  cursor: string;
  /** Whether more comments are available */
  hasMore: boolean;
}

// ============================================================================
// Note Types
// ============================================================================

/**
 * Full note details including content, images, stats, and comments.
 */
export interface XhsNote {
  /** Note ID */
  id: string;
  /** Note title */
  title: string;
  /** Note description/content */
  desc: string;
  /** Note type: video or normal (image/text) */
  type: 'video' | 'normal';
  /** Creation timestamp (Unix milliseconds) */
  time?: number;
  /** IP location of the author */
  ipLocation?: string;
  /** Author information */
  user: {
    nickname: string;
    avatar: string;
    userid: string;
  };
  /** List of images in the note */
  imageList: {
    url: string;
    width?: number;
    height?: number;
  }[];
  /** Video information (for video notes) */
  video?: {
    url: string;
    duration: number;
  };
  /** Tags/topics associated with the note */
  tags?: string[];
  /** Engagement statistics */
  stats: {
    likedCount: string;
    collectedCount: string;
    commentCount: string;
    shareCount: string;
  };
  /** Current user's interaction state with this note */
  interactInfo?: {
    liked: boolean;
    collected: boolean;
  };
  /** Comments (loaded with note details) */
  comments?: XhsCommentList;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * A note item from search results or feeds.
 * Contains minimal information for display in lists.
 */
export interface XhsSearchItem {
  /** Note ID */
  id: string;
  /** Security token required for accessing full note details */
  xsecToken: string;
  /** Note title */
  title: string;
  /** Cover image URL */
  cover: string;
  /** Note type: video or normal (image/text) */
  type: 'video' | 'normal';
  /** Author information */
  user: {
    nickname: string;
    avatar: string;
    userid: string;
  };
  /** Number of likes */
  likes: string;
}

// ============================================================================
// User Types
// ============================================================================

/**
 * User profile information.
 */
export interface XhsUserInfo {
  /** Basic profile information */
  basic: {
    nickname: string;
    avatar: string;
    desc: string;
    gender: number;
    ipLocation?: string;
    redId?: string;
  };
  /** Follower and interaction statistics */
  stats: {
    follows: string;
    fans: string;
    interaction: string;
  };
  /** User's published notes (if loaded) */
  notes?: XhsSearchItem[];
}

// ============================================================================
// Login User Info Types
// ============================================================================

/**
 * User info extracted from __INITIAL_STATE__.user.userInfo after login.
 * This is the current logged-in user's basic information.
 */
export interface LoginUserInfo {
  /** Xiaohongshu user ID */
  userId: string;
  /** Xiaohongshu Red ID (numeric string shown in profile) */
  redId: string;
  /** User's display name */
  nickname: string;
  /** User's bio/description */
  desc: string;
  /** Gender (0 = not specified, 1 = male, 2 = female) */
  gender: number;
  /** Small avatar URL */
  avatar: string;
  /** Large avatar URL */
  avatarLarge?: string;
}

/**
 * Result of a login operation.
 */
export interface LoginResult {
  /** Path or URL to the QR code image */
  qrCodePath: string;
  /** Function to wait for login completion */
  waitForLogin: () => Promise<{ state: any; userInfo: LoginUserInfo | null }>;
}

// ============================================================================
// Search Filter Types
// ============================================================================

/** Sort order options for search results */
export type SearchSortBy = 'general' | 'latest' | 'most_liked' | 'most_commented' | 'most_collected';

/** Note type filter options */
export type SearchNoteType = 'all' | 'video' | 'image';

/** Publish time filter options */
export type SearchPublishTime = 'all' | 'day' | 'week' | 'half_year';

/** Search scope filter options */
export type SearchScope = 'all' | 'viewed' | 'not_viewed' | 'following';

/**
 * Search filter options.
 */
export interface XhsSearchFilters {
  /** Sort order */
  sortBy?: SearchSortBy;
  /** Filter by note type */
  noteType?: SearchNoteType;
  /** Filter by publish time */
  publishTime?: SearchPublishTime;
  /** Filter by search scope */
  searchScope?: SearchScope;
}

// ============================================================================
// Publishing Types
// ============================================================================

/**
 * Parameters for publishing an image/text note.
 */
export interface PublishContentParams {
  /** Note title (max 20 characters) */
  title: string;
  /** Note content/description */
  content: string;
  /** Array of absolute image file paths */
  images: string[];
  /** Optional tags/topics */
  tags?: string[];
  /** Optional scheduled publish time (ISO 8601) */
  scheduleTime?: string;
  /** If true, save as draft instead of publishing */
}

/**
 * Parameters for publishing a video note.
 */
export interface PublishVideoParams {
  /** Note title (max 20 characters) */
  title: string;
  /** Note content/description */
  content: string;
  /** Absolute path to video file */
  videoPath: string;
  /** Optional absolute path to cover image */
  coverPath?: string;
  /** Optional tags/topics */
  tags?: string[];
  /** Optional scheduled publish time (ISO 8601) */
  scheduleTime?: string;
  /** If true, save as draft instead of publishing */
}

/**
 * Result of a publish operation.
 */
export interface PublishResult {
  /** Whether publishing succeeded */
  success: boolean;
  /** Note ID assigned by Xiaohongshu (if available) */
  noteId?: string;
  /** Error message (if failed) */
  error?: string;
}

// ============================================================================
// Interaction Types
// ============================================================================

/**
 * Result of an interaction operation (like, favorite, etc.).
 */
export interface InteractionResult {
  /** Whether the interaction succeeded */
  success: boolean;
  /** Type of action performed */
  action: string;
  /** Target note ID */
  noteId: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Result of a comment operation.
 */
export interface CommentResult {
  /** Whether the comment was posted successfully */
  success: boolean;
  /** Comment ID assigned by Xiaohongshu */
  commentId?: string;
  /** Error message (if failed) */
  error?: string;
}
