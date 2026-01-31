# xhs_like_comment

Like or unlike a comment.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `commentId` | string | Yes | Comment ID |
| `unlike` | boolean | No | Unlike instead of like (default: false) |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multi-account operation |

## Response

```json
{
  "success": true,
  "action": "like_comment",
  "commentId": "xxx"
}
```

## Examples

### Like a comment

```
xhs_like_comment({
  noteId: "abc123",
  xsecToken: "token",
  commentId: "comment-id"
})
```

### Unlike a comment

```
xhs_like_comment({
  noteId: "abc123",
  xsecToken: "token",
  commentId: "comment-id",
  unlike: true
})
```
