# Publishing

Tools for publishing content to Xiaohongshu.

## xhs_publish_content

Publish a new image/text note.

::: warning
Opens a visible browser window for the publishing process.
:::

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Note title (max 20 characters) |
| `content` | string | Yes | Note description/content |
| `images` | string[] | Yes | Array of absolute image paths |
| `tags` | string[] | No | Tags/topics for the note |
| `scheduleTime` | string | No | ISO 8601 datetime for scheduled publishing |
| `account` | string | No | Single account to use |
| `accounts` | string[] \| "all" | No | Multiple accounts |

### Example

```json
{
  "title": "My Post",
  "content": "Check out these photos! #photography",
  "images": [
    "/Users/me/photos/image1.jpg",
    "/Users/me/photos/image2.jpg"
  ],
  "tags": ["photography", "travel"]
}
```

### Scheduled Publishing

```json
{
  "title": "Scheduled Post",
  "content": "Will be published later",
  "images": ["/path/to/image.jpg"],
  "scheduleTime": "2024-12-25T10:00:00+08:00"
}
```

### Response

Single account:
```json
{
  "success": true,
  "noteId": "published-note-id"
}
```

Multiple accounts:
```json
[
  {
    "account": "account1",
    "success": true,
    "result": { "success": true, "noteId": "note-id-1" },
    "durationMs": 15000
  },
  {
    "account": "account2",
    "success": true,
    "result": { "success": true, "noteId": "note-id-2" },
    "durationMs": 14500
  }
]
```

---

## xhs_publish_video

Publish a new video note.

::: warning
Opens a visible browser window for the publishing process.
:::

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Note title (max 20 characters) |
| `content` | string | Yes | Note description/content |
| `videoPath` | string | Yes | Absolute path to video file |
| `coverPath` | string | No | Absolute path to cover image |
| `tags` | string[] | No | Tags/topics for the note |
| `scheduleTime` | string | No | ISO 8601 datetime for scheduled publishing |
| `account` | string | No | Single account to use |
| `accounts` | string[] \| "all" | No | Multiple accounts |

### Example

```json
{
  "title": "My Vlog",
  "content": "A day in my life #vlog #daily",
  "videoPath": "/Users/me/videos/vlog.mp4",
  "coverPath": "/Users/me/videos/cover.jpg",
  "tags": ["vlog", "daily"]
}
```

### Response

```json
{
  "success": true,
  "noteId": "published-note-id"
}
```

---

## Publishing Notes

### File Requirements

**Images:**
- Formats: JPG, PNG, WebP
- Recommended size: 1080x1440 or higher
- Max images per post: 9

**Videos:**
- Formats: MP4, MOV
- Recommended resolution: 1080p
- Max duration: 15 minutes

### Title Restrictions

- Maximum 20 characters
- No excessive punctuation
- No prohibited words

### Content Guidelines

- Include relevant hashtags for discoverability
- Avoid promotional language that triggers filters
- Natural, engaging descriptions perform better

### Rate Limits

- Wait at least 10 minutes between posts
- Don't post the same content to multiple accounts rapidly
- Vary your posting times for natural behavior

### Multi-Account Publishing

When using `accounts` parameter:
- Posts are created sequentially (one at a time)
- Each post gets a unique note ID
- Failures don't stop remaining accounts
- Results include individual success/failure status
