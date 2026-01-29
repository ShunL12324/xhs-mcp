# 快速开始

## 1. 添加账号

首先需要登录小红书账号：

```
xhs_add_account({ name: "我的账号" })
```

系统会返回一个二维码 URL，用小红书 App 扫码登录。

## 2. 搜索内容

```
xhs_search({ keyword: "美食推荐" })
```

返回结果包含 `noteId` 和 `xsecToken`，后续操作需要用到。

## 3. 获取笔记详情

```
xhs_get_note({
  noteId: "xxx",
  xsecToken: "yyy"
})
```

## 4. 互动操作

点赞：
```
xhs_like_feed({
  noteId: "xxx",
  xsecToken: "yyy"
})
```

收藏：
```
xhs_favorite_feed({
  noteId: "xxx",
  xsecToken: "yyy"
})
```

评论：
```
xhs_post_comment({
  noteId: "xxx",
  xsecToken: "yyy",
  content: "写得真好！"
})
```

## 5. 发布内容

发布图文笔记：
```
xhs_publish_content({
  title: "今日分享",
  content: "这是我的第一篇笔记...",
  images: ["/path/to/image1.jpg", "/path/to/image2.jpg"]
})
```

## 下一步

- [多账号操作](/guide/multi-account) - 管理多个账号
- [内容查询](/guide/search-content) - 高级搜索技巧
- [发布指南](/guide/publishing) - 图文和视频发布
