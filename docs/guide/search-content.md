# Search & Content

XHS-MCP provides tools for searching and retrieving content from Xiaohongshu.

## Searching Notes

### Basic Search

```
xhs_search({ keyword: "美食" })
```

### With Filters

```
xhs_search({
  keyword: "旅行",
  count: 50,
  sortBy: "latest",
  noteType: "video",
  publishTime: "week"
})
```

### Filter Options

| Parameter | Values | Description |
|-----------|--------|-------------|
| `sortBy` | `general`, `latest`, `most_liked`, `most_commented`, `most_collected` | Sort order |
| `noteType` | `all`, `video`, `image` | Filter by content type |
| `publishTime` | `all`, `day`, `week`, `half_year` | Filter by publish date |
| `searchScope` | `all`, `viewed`, `not_viewed`, `following` | Filter by view status |

### Search Response

```json
{
  "count": 20,
  "items": [
    {
      "id": "note-id",
      "xsecToken": "security-token",
      "title": "Note title",
      "cover": "https://...",
      "type": "normal",
      "user": {
        "nickname": "Author",
        "avatar": "https://...",
        "userid": "user-id"
      },
      "likes": "1234"
    }
  ]
}
```

::: warning Important
Always save the `xsecToken` from search results - it's required for fetching note details reliably.
:::

## Getting Note Details

```
xhs_get_note({
  noteId: "note-id",
  xsecToken: "token-from-search"
})
```

### Response Structure

```json
{
  "id": "note-id",
  "title": "Note title",
  "desc": "Full description...",
  "type": "normal",
  "time": 1704067200000,
  "user": {
    "nickname": "Author",
    "avatar": "https://...",
    "userid": "user-id"
  },
  "imageList": [
    { "url": "https://...", "width": 1080, "height": 1920 }
  ],
  "video": {
    "url": "https://...",
    "duration": 60
  },
  "tags": ["tag1", "tag2"],
  "stats": {
    "likedCount": "1234",
    "collectedCount": "567",
    "commentCount": "89",
    "shareCount": "12"
  },
  "comments": {
    "list": [...],
    "cursor": "...",
    "hasMore": true
  }
}
```

## User Profiles

```
xhs_user_profile({
  userId: "user-id",
  xsecToken: "optional-token"
})
```

### Response

```json
{
  "basic": {
    "nickname": "Username",
    "avatar": "https://...",
    "desc": "Bio text",
    "gender": 1,
    "ipLocation": "Beijing",
    "redId": "red-id"
  },
  "stats": {
    "follows": "123",
    "fans": "45678",
    "interaction": "1.2M"
  },
  "notes": [...]
}
```

## Homepage Feeds

Get recommended content from the homepage:

```
xhs_list_feeds()
```

## Downloading Media

### Download Images

```
xhs_download_images({
  noteId: "note-id",
  xsecToken: "token"
})
```

Images are saved to `~/.xhs-mcp/downloads/images/{noteId}/`

### Download Videos

```
xhs_download_video({
  noteId: "note-id",
  xsecToken: "token"
})
```

Videos are saved to `~/.xhs-mcp/downloads/videos/{noteId}/`
