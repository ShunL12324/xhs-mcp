# xhs_get_note

获取笔记详情。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteId` | string | 是 | 笔记 ID |
| `xsecToken` | string | 是 | 安全令牌（从搜索结果获取） |
| `account` | string | 否 | 使用的账号 |

## 返回值

```json
{
  "id": "note-id",
  "title": "笔记标题",
  "content": "笔记正文...",
  "type": "image",
  "images": [
    {
      "url": "图片URL",
      "width": 1080,
      "height": 1920
    }
  ],
  "video": null,
  "tags": ["标签1", "标签2"],
  "user": {
    "id": "user-id",
    "nickname": "用户名",
    "avatar": "头像URL"
  },
  "stats": {
    "likes": 1234,
    "collects": 567,
    "comments": 89,
    "shares": 12
  },
  "interactInfo": {
    "liked": false,
    "collected": false
  },
  "comments": [
    {
      "id": "comment-id",
      "content": "评论内容",
      "user": {
        "id": "user-id",
        "nickname": "评论者"
      },
      "likes": 10,
      "createTime": "2024-01-15T12:00:00Z"
    }
  ],
  "createTime": "2024-01-10T10:00:00Z"
}
```

## 示例

```
xhs_get_note({
  noteId: "abc123",
  xsecToken: "token-from-search"
})
```

## 注意事项

- `xsecToken` 必须从搜索结果中获取，直接访问无效
- `interactInfo` 显示当前账号是否已点赞/收藏
- `comments` 返回部分评论，可能需要翻页
