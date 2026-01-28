import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'XHS-MCP',
  description: 'Xiaohongshu MCP Server - Multi-account automation for RedNote',
  base: '/xhs-mcp/',

  head: [
    ['link', { rel: 'icon', href: '/xhs-mcp/favicon.ico' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/ShunL12324/xhs-mcp' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Multi-Account', link: '/guide/multi-account' },
            { text: 'Search & Content', link: '/guide/search-content' },
            { text: 'Publishing', link: '/guide/publishing' },
            { text: 'Interactions', link: '/guide/interactions' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'MCP Tools',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Account Management', link: '/api/account' },
            { text: 'Content Query', link: '/api/content' },
            { text: 'Publishing', link: '/api/publish' },
            { text: 'Interactions', link: '/api/interaction' },
            { text: 'Statistics', link: '/api/stats' },
          ]
        }
      ]
    },

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
