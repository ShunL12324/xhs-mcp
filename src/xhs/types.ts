// 评论
export interface XhsComment {
  id: string;
  content: string;
  likeCount: string;
  createTime: number;
  ipLocation?: string;
  user: {
    nickname: string;
    avatar: string;
    userid: string;
  };
  subCommentCount?: string;
  subComments?: XhsComment[];
}

// 评论列表
export interface XhsCommentList {
  list: XhsComment[];
  cursor: string;
  hasMore: boolean;
}

// 笔记详情（包含评论）
export interface XhsNote {
  id: string;
  title: string;
  desc: string;
  type: 'video' | 'normal';
  time?: number;
  ipLocation?: string;
  user: {
    nickname: string;
    avatar: string;
    userid: string;
  };
  imageList: {
    url: string;
    width?: number;
    height?: number;
  }[];
  video?: {
    url: string;
    duration: number;
  };
  tags?: string[];
  stats: {
    likedCount: string;
    collectedCount: string;
    commentCount: string;
    shareCount: string;
  };
  // 互动状态
  interactInfo?: {
    liked: boolean;
    collected: boolean;
  };
  // 评论列表（从详情页一起获取）
  comments?: XhsCommentList;
}

// 搜索结果项
export interface XhsSearchItem {
  id: string;
  xsecToken: string;
  title: string;
  cover: string;
  type: 'video' | 'normal';
  user: {
    nickname: string;
    avatar: string;
    userid: string;
  };
  likes: string;
}

// 用户信息
export interface XhsUserInfo {
  basic: {
    nickname: string;
    avatar: string;
    desc: string;
    gender: number;
    ipLocation?: string;
    redId?: string;
  };
  stats: {
    follows: string;
    fans: string;
    interaction: string;
  };
  notes?: XhsSearchItem[];
}

// 搜索过滤器选项
export type SearchSortBy = 'general' | 'latest' | 'most_liked' | 'most_commented' | 'most_collected';
export type SearchNoteType = 'all' | 'video' | 'image';
export type SearchPublishTime = 'all' | 'day' | 'week' | 'half_year';
export type SearchScope = 'all' | 'viewed' | 'not_viewed' | 'following';

export interface XhsSearchFilters {
  sortBy?: SearchSortBy;
  noteType?: SearchNoteType;
  publishTime?: SearchPublishTime;
  searchScope?: SearchScope;
}

// 发布参数
export interface PublishContentParams {
  title: string;
  content: string;
  images: string[];
  tags?: string[];
  scheduleTime?: string;
}

export interface PublishVideoParams {
  title: string;
  content: string;
  videoPath: string;
  coverPath?: string;
  tags?: string[];
  scheduleTime?: string;
}

// 发布结果
export interface PublishResult {
  success: boolean;
  noteId?: string;
  error?: string;
}

// 互动结果
export interface InteractionResult {
  success: boolean;
  action: string;
  noteId: string;
  error?: string;
}

// 评论结果
export interface CommentResult {
  success: boolean;
  commentId?: string;
  error?: string;
}
