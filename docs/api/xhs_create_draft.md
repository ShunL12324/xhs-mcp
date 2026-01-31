# xhs_create_draft

创建笔记草稿。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 笔记标题（最多 20 字） |
| `content` | string | 是 | 笔记正文 |
| `images` | string[] | 是 | 图片路径数组 |
| `tags` | string[] | 否 | 话题标签 |

## 返回值

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "title": "笔记标题",
  "imageCount": 3
}
```

## 示例

```
xhs_create_draft({
  title: "今日咖啡分享",
  content: "今天尝试了一家新的咖啡店...",
  images: ["/path/to/image1.png", "/path/to/image2.png"],
  tags: ["咖啡", "探店"]
})
```

## 注意事项

- 草稿保存在本地数据库
- 使用 `xhs_publish_draft` 发布草稿
- 图片路径可以是 AI 生成的图片或本地图片
