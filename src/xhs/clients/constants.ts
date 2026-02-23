/**
 * @fileoverview Constants for browser automation.
 * Contains all selectors, timeouts, and configuration values.
 * @module xhs/clients/constants
 */

import { config } from '../../core/config.js';

// Fixed User-Agent matching Playwright's Chromium version (Chrome 143)
export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

// Anti-detection browser launch arguments (based on MediaCrawler)
export const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',  // Disable automation control flag
  '--disable-infobars',                              // Disable info bars
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-notifications',                         // 禁用通知弹窗
  '--disable-features=ExternalProtocolDialog',       // 禁用"访问其他应用"对话框
  '--disable-session-crashed-bubble',                // 禁用"意外关闭"恢复提示
  '--hide-crash-restore-bubble',                     // 隐藏崩溃恢复气泡
  '--noerrdialogs',                                  // 禁用错误对话框
  '--deny-permission-prompts',                       // 拒绝所有权限请求（地理位置等）
];

/**
 * 超时时间常量（毫秒）
 * 用于控制各种操作的最大等待时间
 * 部分值可通过环境变量覆盖
 */
export const TIMEOUTS = {
  /** 页面加载超时 (XHS_MCP_TIMEOUT_PAGE_LOAD) */
  PAGE_LOAD: config.timeout.pageLoad,
  /** 等待用户扫码登录超时 */
  LOGIN_WAIT: 120000,
  /** 检查登录状态超时 */
  LOGIN_CHECK: 15000,
  /** 等待网络空闲超时 */
  NETWORK_IDLE: 10000,
  /** 等待上传内容区域出现 */
  UPLOAD_CONTENT: 15000,
  /** 视频上传处理超时 (XHS_MCP_TIMEOUT_VIDEO_UPLOAD) */
  VIDEO_UPLOAD: config.timeout.videoUpload,
  /** 图片上传完成超时 */
  IMAGE_UPLOAD: 60000,
} as const;

/**
 * 搜索相关常量
 */
export const SEARCH_DEFAULTS = {
  /** 默认搜索结果数量 */
  COUNT: 20,
  /** 最大搜索结果数量 */
  MAX_COUNT: 500,
  /** 默认搜索超时时间（毫秒） */
  TIMEOUT: 60000,
  /** 连续无新数据时的最大重试次数 */
  MAX_NO_DATA_RETRIES: 3,
} as const;

/**
 * 滚动加载配置
 * 模拟人类滚动行为，避免被检测为机器人
 */
export const SCROLL_CONFIG = {
  /** 最小滚动距离（像素） */
  MIN_DISTANCE: 400,
  /** 最大滚动距离（像素） */
  MAX_DISTANCE: 800,
  /** 滚动后最小延迟（毫秒） */
  MIN_DELAY: 1000,
  /** 滚动后最大延迟（毫秒） */
  MAX_DELAY: 2000,
  /** 回滚概率（模拟人类偶尔向上滚动） */
  SCROLL_BACK_CHANCE: 0.08,
  /** 鼠标移动概率（增加自然性） */
  MOUSE_MOVE_CHANCE: 0.3,
} as const;

/**
 * UI 操作延迟常量（毫秒）
 * 用于等待 UI 动画和状态更新
 */
export const DELAYS = {
  /** 过滤器点击后等待 */
  FILTER_CLICK: 300,
  /** 过滤器面板展开后等待 */
  FILTER_PANEL_OPEN: 500,
  /** 加载更多数据时的额外等待（基础值 + 随机值） */
  SCROLL_EXTRA_BASE: 500,
  /** 加载更多数据时的额外等待随机范围 */
  SCROLL_EXTRA_RANDOM: 500,
} as const;

// Request interval to avoid rate limiting (XHS_MCP_REQUEST_INTERVAL)
export const REQUEST_INTERVAL = config.browser.requestInterval;

/**
 * 发布页面 CSS 选择器
 * 用于定位创作者发布页面的各个元素
 */
export const PUBLISH_SELECTORS = {
  /** 文件上传输入框 */
  uploadInput: '.upload-input',
  /** 标题输入框 */
  titleInput: 'div.d-input input',
  /** 富文本内容编辑器 */
  contentEditor: 'div.ql-editor',
  /** 内容输入框（备选选择器） */
  contentTextbox: '[role="textbox"]',
  /** 发布按钮 */
  publishBtn: 'div.publish-page-publish-btn button, button.publishBtn',
  /** 话题标签容器 */
  topicContainer: '#creator-editor-topic-container .item',
  /** 定时发布单选按钮 */
  scheduleRadio: '[class*="radio"]:has-text("定时发布")',
  /** 上传图文标签页 */
  uploadImageTab: '.creator-tab:has-text("上传图文")',
  /** 上传视频标签页 */
  uploadVideoTab: '.creator-tab:has-text("上传视频")',
};

/**
 * 互动按钮 CSS 选择器
 * 用于定位笔记详情页的点赞、收藏等按钮
 */
export const INTERACTION_SELECTORS = {
  /** 点赞按钮 */
  likeButton: '.interact-container .left .like-wrapper, .engage-bar .like-wrapper',
  /** 已点赞状态 */
  likeActive: '.like-active, .liked',
  /** 收藏按钮 */
  collectButton: '.interact-container .left .collect-wrapper, .engage-bar .collect-wrapper',
  /** 已收藏状态 */
  collectActive: '.collect-active, .collected',
};

/**
 * 评论区 CSS 选择器
 * 用于定位评论输入和提交相关元素
 */
export const COMMENT_SELECTORS = {
  /** 评论输入框触发器（点击后显示输入框） */
  commentInputTrigger: 'div.input-box div.content-edit span, .comment-input',
  /** 评论输入框 */
  commentInput: 'div.input-box div.content-edit p.content-input, .comment-input textarea',
  /** 提交评论按钮 */
  submitButton: 'div.bottom button.submit, .comment-submit',
  /** 回复按钮 */
  replyButton: '.right .interactions .reply, .reply-btn',
};

/**
 * 搜索过滤器中文映射
 * 将 API 参数值映射到小红书 UI 上的中文标签
 */
export const SEARCH_FILTER_MAP = {
  /** 排序方式 */
  sortBy: {
    general: '综合',
    latest: '最新',
    most_liked: '最多点赞',
    most_commented: '最多评论',
    most_collected: '最多收藏',
  },
  /** 笔记类型 */
  noteType: {
    all: '不限',
    video: '视频',
    image: '图文',
  },
  /** 发布时间 */
  publishTime: {
    all: '不限',
    day: '一天内',
    week: '一周内',
    half_year: '半年内',
  },
  /** 搜索范围 */
  searchScope: {
    all: '不限',
    viewed: '已看过',
    not_viewed: '未看过',
    following: '已关注',
  },
};

/**
 * Explore 页面 CSS 选择器
 * 用于自动浏览首页时定位元素
 */
export const EXPLORE_SELECTORS = {
  /** 笔记卡片封面（可点击） */
  noteCover: 'section.note-item a.cover',
  /** 笔记详情 modal 容器 */
  noteContainer: '#noteContainer',
  /** modal 内点赞按钮（engage-bar 内，避免匹配评论区点赞） */
  likeWrapper: '#noteContainer .engage-bar .like-wrapper',
  /** 已点赞状态类名 */
  likeActiveClass: 'like-active',
  /** modal 内评论输入区域 */
  commentInputArea: '#noteContainer div.input-box div.content-edit',
  /** modal 内评论输入框 */
  commentInput: '#noteContainer div.input-box div.content-edit p.content-input',
  /** modal 内评论提交按钮 */
  commentSubmit: '#noteContainer div.bottom button.submit',
  /** modal 关闭按钮 */
  closeButton: 'div.note-detail-mask > div.close-circle',
} as const;

// QR code selector for login (matching Go project: .login-container .qrcode-img)
export const QR_CODE_SELECTOR = '.login-container .qrcode-img, #app > div:nth-child(1) > div > div.login-container > div.left > div.code-area > div.qrcode.force-light > img';

// Login status selector (matching Go project: .main-container .user .link-wrapper .channel)
export const LOGIN_STATUS_SELECTOR = '.main-container .user .link-wrapper .channel';

// URLs (matching Go project)
export const URLS = {
  EXPLORE: 'https://www.xiaohongshu.com/explore',
  PUBLISH: 'https://creator.xiaohongshu.com/publish/publish?source=official',
} as const;
