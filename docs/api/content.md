# Content Query

Tools for searching and retrieving content from Xiaohongshu.

## xhs_search

Search for notes on Xiaohongshu with optional filters.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | Yes | Search keyword |
| `count` | number | No | Number of results (default: 20, max: 500) |
| `timeout` | number | No | Timeout in milliseconds (default: 60000) |
| `sortBy` | string | No | Sort order (see options below) |
| `noteType` | string | No | Filter by note type |
| `publishTime` | string | No | Filter by publish time |
| `searchScope` | string | No | Filter by view status |
| `account` | string | No | Account to use |

### Filter Options

**sortBy:**
- `general` - Default relevance
- `latest` - Most recent
- `most_liked` - Most likes
- `most_commented` - Most comments
- `most_collected` - Most favorites

**noteType:**
- `all` - All types (default)
- `video` - Video notes only
- `image` - Image notes only

**publishTime:**
- `all` - Any time (default)
- `day` - Last 24 hours
- `week` - Last 7 days
- `half_year` - Last 6 months

**searchScope:**
- `all` - All notes (default)
- `viewed` - Notes you've viewed
- `not_viewed` - Notes you haven't viewed
- `following` - From accounts you follow

### Response

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

---

## xhs_get_note

Get detailed information about a specific note.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token from search |
| `account` | string | No | Account to use |

### Response

```json
{
  "id": "note-id",
  "title": "Note title",
  "desc": "Full description...",
  "type": "normal",
  "time": 1704067200000,
  "ipLocation": "Beijing",
  "user": {
    "nickname": "Author",
    "avatar": "https://...",
    "userid": "user-id"
  },
  "imageList": [
    {
      "url": "https://...",
      "width": 1080,
      "height": 1920
    }
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
  "interactInfo": {
    "liked": false,
    "collected": false
  },
  "comments": {
    "list": [
      {
        "id": "comment-id",
        "content": "Comment text",
        "likeCount": "10",
        "createTime": 1704067200000,
        "user": {
          "nickname": "Commenter",
          "avatar": "https://...",
          "userid": "user-id"
        },
        "subCommentCount": "2",
        "subComments": [...]
      }
    ],
    "cursor": "...",
    "hasMore": true
  }
}
```

---

## xhs_user_profile

Get user profile information and their published notes.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |
| `xsecToken` | string | No | Security token |
| `account` | string | No | Account to use |

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
  "notes": [
    {
      "id": "note-id",
      "xsecToken": "token",
      "title": "Note title",
      "cover": "https://...",
      "type": "normal",
      "likes": "100"
    }
  ]
}
```

---

## xhs_list_feeds

Get homepage recommended feeds.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account to use |

### Response

```json
{
  "count": 20,
  "items": [
    {
      "id": "note-id",
      "xsecToken": "token",
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

---

## xhs_download_images

Download all images from a note.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `account` | string | No | Account to use |

### Response

```json
{
  "success": true,
  "noteId": "note-id",
  "downloadPath": "~/.xhs-mcp/downloads/images/note-id",
  "files": [
    {
      "path": "~/.xhs-mcp/downloads/images/note-id/1.jpg",
      "size": 102400,
      "url": "https://..."
    }
  ]
}
```

---

## xhs_download_video

Download video from a note.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `account` | string | No | Account to use |

### Response

```json
{
  "success": true,
  "noteId": "note-id",
  "path": "~/.xhs-mcp/downloads/videos/note-id/video.mp4",
  "size": 10485760,
  "url": "https://..."
}
```
