import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'XHS-MCP',
  description: '小红书 MCP 服务器 - AI 驱动的多账号自动化',
  base: '/xhs-mcp/',

  head: [
    ['link', { rel: 'icon', href: '/xhs-mcp/favicon.ico' }]
  ],

  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/' },
          { text: 'API', link: '/api/' },
          { text: 'GitHub', link: 'https://github.com/ShunL12324/xhs-mcp' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: '开始使用',
              items: [
                { text: '简介', link: '/guide/' },
                { text: '安装', link: '/guide/installation' },
                { text: '快速开始', link: '/guide/quick-start' },
              ]
            },
            {
              text: '功能',
              items: [
                { text: '多账号管理', link: '/guide/multi-account' },
                { text: '内容查询', link: '/guide/search-content' },
                { text: '发布内容', link: '/guide/publishing' },
                { text: '互动功能', link: '/guide/interactions' },
              ]
            }
          ],
          '/api/': [
            {
              text: '账号管理',
              items: [
                { text: '概览', link: '/api/' },
                { text: 'xhs_list_accounts', link: '/api/xhs_list_accounts' },
                { text: 'xhs_add_account', link: '/api/xhs_add_account' },
                { text: 'xhs_remove_account', link: '/api/xhs_remove_account' },
                { text: 'xhs_set_account_config', link: '/api/xhs_set_account_config' },
                { text: 'xhs_check_login', link: '/api/xhs_check_login' },
                { text: 'xhs_delete_cookies', link: '/api/xhs_delete_cookies' },
              ]
            },
            {
              text: '内容查询',
              items: [
                { text: 'xhs_search', link: '/api/xhs_search' },
                { text: 'xhs_get_note', link: '/api/xhs_get_note' },
                { text: 'xhs_user_profile', link: '/api/xhs_user_profile' },
                { text: 'xhs_list_feeds', link: '/api/xhs_list_feeds' },
              ]
            },
            {
              text: '内容发布',
              items: [
                { text: 'xhs_publish_content', link: '/api/xhs_publish_content' },
                { text: 'xhs_publish_video', link: '/api/xhs_publish_video' },
              ]
            },
            {
              text: '互动功能',
              items: [
                { text: 'xhs_like_feed', link: '/api/xhs_like_feed' },
                { text: 'xhs_favorite_feed', link: '/api/xhs_favorite_feed' },
                { text: 'xhs_post_comment', link: '/api/xhs_post_comment' },
                { text: 'xhs_reply_comment', link: '/api/xhs_reply_comment' },
              ]
            },
            {
              text: '数据统计',
              items: [
                { text: 'xhs_get_account_stats', link: '/api/xhs_get_account_stats' },
                { text: 'xhs_get_operation_logs', link: '/api/xhs_get_operation_logs' },
              ]
            },
            {
              text: '下载',
              items: [
                { text: 'xhs_download_images', link: '/api/xhs_download_images' },
                { text: 'xhs_download_video', link: '/api/xhs_download_video' },
              ]
            }
          ]
        },
        outlineTitle: '目录',
        docFooter: {
          prev: '上一页',
          next: '下一页'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/' },
          { text: 'API', link: '/en/api/' },
          { text: 'GitHub', link: 'https://github.com/ShunL12324/xhs-mcp' }
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Introduction', link: '/en/guide/' },
                { text: 'Installation', link: '/en/guide/installation' },
                { text: 'Quick Start', link: '/en/guide/quick-start' },
              ]
            },
            {
              text: 'Features',
              items: [
                { text: 'Multi-Account', link: '/en/guide/multi-account' },
                { text: 'Search & Content', link: '/en/guide/search-content' },
                { text: 'Publishing', link: '/en/guide/publishing' },
                { text: 'Interactions', link: '/en/guide/interactions' },
              ]
            }
          ],
          '/en/api/': [
            {
              text: 'Account',
              items: [
                { text: 'Overview', link: '/en/api/' },
                { text: 'xhs_list_accounts', link: '/en/api/xhs_list_accounts' },
                { text: 'xhs_add_account', link: '/en/api/xhs_add_account' },
                { text: 'xhs_remove_account', link: '/en/api/xhs_remove_account' },
                { text: 'xhs_set_account_config', link: '/en/api/xhs_set_account_config' },
                { text: 'xhs_check_login', link: '/en/api/xhs_check_login' },
                { text: 'xhs_delete_cookies', link: '/en/api/xhs_delete_cookies' },
              ]
            },
            {
              text: 'Content',
              items: [
                { text: 'xhs_search', link: '/en/api/xhs_search' },
                { text: 'xhs_get_note', link: '/en/api/xhs_get_note' },
                { text: 'xhs_user_profile', link: '/en/api/xhs_user_profile' },
                { text: 'xhs_list_feeds', link: '/en/api/xhs_list_feeds' },
              ]
            },
            {
              text: 'Publish',
              items: [
                { text: 'xhs_publish_content', link: '/en/api/xhs_publish_content' },
                { text: 'xhs_publish_video', link: '/en/api/xhs_publish_video' },
              ]
            },
            {
              text: 'Interact',
              items: [
                { text: 'xhs_like_feed', link: '/en/api/xhs_like_feed' },
                { text: 'xhs_favorite_feed', link: '/en/api/xhs_favorite_feed' },
                { text: 'xhs_post_comment', link: '/en/api/xhs_post_comment' },
                { text: 'xhs_reply_comment', link: '/en/api/xhs_reply_comment' },
              ]
            },
            {
              text: 'Stats',
              items: [
                { text: 'xhs_get_account_stats', link: '/en/api/xhs_get_account_stats' },
                { text: 'xhs_get_operation_logs', link: '/en/api/xhs_get_operation_logs' },
              ]
            },
            {
              text: 'Download',
              items: [
                { text: 'xhs_download_images', link: '/en/api/xhs_download_images' },
                { text: 'xhs_download_video', link: '/en/api/xhs_download_video' },
              ]
            }
          ]
        }
      }
    }
  },

  themeConfig: {
    logo: '/logo.svg',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ShunL12324/xhs-mcp' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present'
    },

    search: {
      provider: 'local'
    }
  }
})
