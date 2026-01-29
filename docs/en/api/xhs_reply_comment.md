# xhs_reply_comment

Reply to a comment.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `commentId` | string | Yes | Comment ID to reply to |
| `content` | string | Yes | Reply content |
| `account` | string | No | Account to use |

## Response

```json
{
  "success": true,
  "commentId": "reply-id"
}
```

## Example

```
xhs_reply_comment({
  noteId: "abc123",
  xsecToken: "token",
  commentId: "comment-456",
  content: "Thanks for your support!"
})
```

## Getting Comment ID

Comment ID can be obtained from `xhs_get_note` response:

```
xhs_get_note({ noteId: "abc123", xsecToken: "token" })
// Response includes comments[].id
```
