# 发布内容

## 发布图文笔记

```
xhs_publish_content({
  title: "标题（最多20字）",
  content: "正文内容...",
  images: ["/absolute/path/to/image1.jpg", "/absolute/path/to/image2.jpg"]
})
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 标题，最多 20 字 |
| `content` | string | 是 | 正文内容 |
| `images` | string[] | 是 | 图片绝对路径数组 |
| `tags` | string[] | 否 | 话题标签 |
| `scheduleTime` | string | 否 | 定时发布时间（ISO 8601 格式） |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号发布 |

### 带标签发布

```
xhs_publish_content({
  title: "今日穿搭",
  content: "分享一下今天的搭配...",
  images: ["/path/to/ootd.jpg"],
  tags: ["穿搭", "日常", "时尚"]
})
```

### 定时发布

```
xhs_publish_content({
  title: "早安分享",
  content: "...",
  images: ["/path/to/image.jpg"],
  scheduleTime: "2024-01-20T08:00:00+08:00"
})
```

## 发布视频笔记

```
xhs_publish_video({
  title: "视频标题",
  content: "视频描述...",
  videoPath: "/absolute/path/to/video.mp4"
})
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 标题，最多 20 字 |
| `content` | string | 是 | 视频描述 |
| `videoPath` | string | 是 | 视频文件绝对路径 |
| `coverPath` | string | 否 | 封面图片路径 |
| `tags` | string[] | 否 | 话题标签 |
| `scheduleTime` | string | 否 | 定时发布时间 |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号发布 |

### 自定义封面

```
xhs_publish_video({
  title: "Vlog",
  content: "...",
  videoPath: "/path/to/vlog.mp4",
  coverPath: "/path/to/cover.jpg"
})
```

## 多账号发布

同一内容发布到多个账号：

```
xhs_publish_content({
  title: "...",
  content: "...",
  images: [...],
  accounts: ["账号1", "账号2"]
})
```

发布到所有活跃账号：

```
xhs_publish_content({
  title: "...",
  content: "...",
  images: [...],
  accounts: "all"
})
```

::: warning 注意
发布操作需要显示浏览器窗口，不支持完全无头模式。
:::

## 注意事项

1. **图片/视频路径必须是绝对路径**
2. **标题最多 20 个字符**
3. **发布需要可见的浏览器窗口**
4. **遵守小红书社区规范**
