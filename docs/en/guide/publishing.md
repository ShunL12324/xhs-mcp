# Publishing Content

XHS-MCP supports publishing image/text and video notes to Xiaohongshu.

::: warning Note
Publishing opens a visible browser window to handle the upload process. This is required due to Xiaohongshu's anti-automation measures.
:::

## Publishing Image Notes

```
xhs_publish_content({
  title: "My First Post",
  content: "Check out these amazing photos! #photography #travel",
  images: [
    "/absolute/path/to/image1.jpg",
    "/absolute/path/to/image2.jpg"
  ],
  tags: ["photography", "travel"],
  account: "my-account"
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Note title (max 20 characters) |
| `content` | string | Yes | Note description/content |
| `images` | string[] | Yes | Array of absolute image paths |
| `tags` | string[] | No | Tags/topics for the note |
| `scheduleTime` | string | No | ISO 8601 datetime for scheduled publishing |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multiple accounts |

### Scheduled Publishing

```
xhs_publish_content({
  title: "Scheduled Post",
  content: "This will be published tomorrow!",
  images: ["/path/to/image.jpg"],
  scheduleTime: "2024-12-25T10:00:00Z"
})
```

## Publishing Video Notes

```
xhs_publish_video({
  title: "My Video",
  content: "Check out this video! #video #vlog",
  videoPath: "/absolute/path/to/video.mp4",
  coverPath: "/absolute/path/to/cover.jpg",
  tags: ["video", "vlog"]
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Note title (max 20 characters) |
| `content` | string | Yes | Note description/content |
| `videoPath` | string | Yes | Absolute path to video file |
| `coverPath` | string | No | Absolute path to cover image |
| `tags` | string[] | No | Tags/topics for the note |
| `scheduleTime` | string | No | ISO 8601 datetime for scheduled publishing |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multiple accounts |

## Multi-Account Publishing

Publish the same content to multiple accounts:

```
xhs_publish_content({
  title: "Cross-Post",
  content: "Posted to multiple accounts!",
  images: ["/path/to/image.jpg"],
  accounts: ["account1", "account2"]
})
```

Or to all active accounts:

```
xhs_publish_content({
  title: "Broadcast",
  content: "Posted to everyone!",
  images: ["/path/to/image.jpg"],
  accounts: "all"
})
```

::: tip Sequential Execution
Multi-account publishing runs sequentially (one at a time) to avoid browser conflicts.
:::

## Response

```json
{
  "success": true,
  "noteId": "published-note-id"
}
```

Or for multiple accounts:

```json
[
  { "account": "account1", "success": true, "result": { "noteId": "..." } },
  { "account": "account2", "success": true, "result": { "noteId": "..." } }
]
```

## Best Practices

1. **Image Quality**: Use high-resolution images (recommended: 1080x1440 or higher)
2. **Title Length**: Keep titles under 20 characters
3. **Tags**: Use 3-5 relevant tags for better discoverability
4. **Timing**: Schedule posts during peak hours (evening in China timezone)
5. **Rate Limits**: Don't publish too frequently - wait at least 10 minutes between posts
