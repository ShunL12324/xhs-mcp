# xhs_publish_content

发布图文笔记或保存为草稿。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 标题（最多 20 字） |
| `content` | string | 是 | 正文内容 |
| `images` | string[] | 是 | 图片绝对路径数组 |
| `tags` | string[] | 否 | 话题标签 |
| `scheduleTime` | string | 否 | 定时发布时间（ISO 8601） |
| `saveDraft` | boolean | 否 | 是否保存为草稿，默认 false |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号发布 |

## 返回值

```json
{
  "success": true,
  "noteId": "xxx"
}
```

## 示例

### 基本发布

```
xhs_publish_content({
  title: "今日分享",
  content: "这是正文内容...",
  images: ["/path/to/image1.jpg", "/path/to/image2.jpg"]
})
```

### 保存为草稿

```
xhs_publish_content({
  title: "草稿标题",
  content: "先保存，稍后发布...",
  images: ["/path/to/image.jpg"],
  saveDraft: true
})
```

### 带标签发布

```
xhs_publish_content({
  title: "穿搭分享",
  content: "今天的OOTD...",
  images: ["/path/to/ootd.jpg"],
  tags: ["穿搭", "日常", "时尚"]
})
```

### 定时发布

```
xhs_publish_content({
  title: "早安",
  content: "...",
  images: ["/path/to/image.jpg"],
  scheduleTime: "2024-01-20T08:00:00+08:00"
})
```

### 多账号发布

```
xhs_publish_content({
  title: "...",
  content: "...",
  images: [...],
  accounts: ["账号1", "账号2"]
})
```

## 注意事项

- 图片路径必须是绝对路径
- 标题最多 20 个字符
- 发布操作需要显示浏览器窗口
- 草稿保存到小红书创作者中心
