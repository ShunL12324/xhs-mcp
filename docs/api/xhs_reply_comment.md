# xhs_reply_comment

回复评论。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteId` | string | 是 | 笔记 ID |
| `xsecToken` | string | 是 | 安全令牌 |
| `commentId` | string | 是 | 要回复的评论 ID |
| `content` | string | 是 | 回复内容 |
| `account` | string | 否 | 使用的账号 |

## 返回值

```json
{
  "success": true,
  "commentId": "reply-id"
}
```

## 示例

```
xhs_reply_comment({
  noteId: "abc123",
  xsecToken: "token",
  commentId: "comment-456",
  content: "谢谢你的喜欢！"
})
```

## 获取评论 ID

评论 ID 可以从 `xhs_get_note` 返回的 `comments` 数组中获取：

```
xhs_get_note({ noteId: "abc123", xsecToken: "token" })
// 返回中包含 comments[].id
```
