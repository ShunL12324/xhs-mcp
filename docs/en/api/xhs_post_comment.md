# xhs_post_comment

Post a comment.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `content` | string | Yes | Comment content |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multi-account |

## Response

```json
{
  "success": true,
  "commentId": "comment-id"
}
```

## Example

### Post comment

```
xhs_post_comment({
  noteId: "abc123",
  xsecToken: "token",
  content: "Great post!"
})
```

### Multi-account comment

```
xhs_post_comment({
  noteId: "abc123",
  xsecToken: "token",
  content: "Nice!",
  accounts: ["acc1", "acc2"]
})
```

## Notes

- Follow community guidelines
- Frequent comments may trigger rate limits
