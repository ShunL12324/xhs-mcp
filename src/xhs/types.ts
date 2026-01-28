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
