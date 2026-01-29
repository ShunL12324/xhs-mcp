# xhs_post_comment

发表评论。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteId` | string | 是 | 笔记 ID |
| `xsecToken` | string | 是 | 安全令牌 |
| `content` | string | 是 | 评论内容 |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号操作 |

## 返回值

```json
{
  "success": true,
  "commentId": "comment-id"
}
```

## 示例

### 发表评论

```
xhs_post_comment({
  noteId: "abc123",
  xsecToken: "token",
  content: "写得真好！"
})
```

### 多账号评论

```
xhs_post_comment({
  noteId: "abc123",
  xsecToken: "token",
  content: "支持！",
  accounts: ["账号1", "账号2"]
})
```

## 注意事项

- 评论内容需遵守社区规范
- 频繁评论可能触发限制
