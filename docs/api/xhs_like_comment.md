# xhs_like_comment

点赞或取消点赞评论。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteId` | string | 是 | 笔记 ID |
| `xsecToken` | string | 是 | 安全令牌 |
| `commentId` | string | 是 | 评论 ID |
| `unlike` | boolean | 否 | 是否取消点赞（默认 false） |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号操作 |

## 返回值

```json
{
  "success": true,
  "action": "like_comment",
  "commentId": "xxx"
}
```

## 示例

### 点赞评论

```
xhs_like_comment({
  noteId: "abc123",
  xsecToken: "token",
  commentId: "comment-id"
})
```

### 取消点赞评论

```
xhs_like_comment({
  noteId: "abc123",
  xsecToken: "token",
  commentId: "comment-id",
  unlike: true
})
```
