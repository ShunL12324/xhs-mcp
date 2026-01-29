# xhs_publish_video

发布视频笔记。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 标题（最多 20 字） |
| `content` | string | 是 | 视频描述 |
| `videoPath` | string | 是 | 视频文件绝对路径 |
| `coverPath` | string | 否 | 封面图片路径 |
| `tags` | string[] | 否 | 话题标签 |
| `scheduleTime` | string | 否 | 定时发布时间（ISO 8601） |
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
xhs_publish_video({
  title: "我的Vlog",
  content: "记录今天的日常...",
  videoPath: "/path/to/video.mp4"
})
```

### 自定义封面

```
xhs_publish_video({
  title: "旅行记录",
  content: "...",
  videoPath: "/path/to/travel.mp4",
  coverPath: "/path/to/cover.jpg"
})
```

### 带标签发布

```
xhs_publish_video({
  title: "教程",
  content: "...",
  videoPath: "/path/to/tutorial.mp4",
  tags: ["教程", "干货", "学习"]
})
```

## 注意事项

- 视频路径必须是绝对路径
- 发布操作需要显示浏览器窗口
- 大视频上传需要较长时间
