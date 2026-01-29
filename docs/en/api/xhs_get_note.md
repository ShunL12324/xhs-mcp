# xhs_get_note

Get note details.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token (from search results) |
| `account` | string | No | Account to use |

## Response

```json
{
  "id": "note-id",
  "title": "Note title",
  "content": "Note content...",
  "type": "image",
  "images": [
    {
      "url": "Image URL",
      "width": 1080,
      "height": 1920
    }
  ],
  "video": null,
  "tags": ["tag1", "tag2"],
  "user": {
    "id": "user-id",
    "nickname": "Username",
    "avatar": "Avatar URL"
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
      "content": "Comment content",
      "user": {
        "id": "user-id",
        "nickname": "Commenter"
      },
      "likes": 10,
      "createTime": "2024-01-15T12:00:00Z"
    }
  ],
  "createTime": "2024-01-10T10:00:00Z"
}
```

## Example

```
xhs_get_note({
  noteId: "abc123",
  xsecToken: "token-from-search"
})
```

## Notes

- `xsecToken` must be obtained from search results
- `interactInfo` shows if current account has liked/collected
- `comments` returns partial comments, may need pagination
