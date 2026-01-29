# xhs_publish_content

Publish image/text note or save as draft.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Title (max 20 chars) |
| `content` | string | Yes | Content |
| `images` | string[] | Yes | Array of absolute image paths |
| `tags` | string[] | No | Topic tags |
| `scheduleTime` | string | No | Scheduled time (ISO 8601) |
| `saveDraft` | boolean | No | Save as draft instead of publishing, default false |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multi-account publish |

## Response

```json
{
  "success": true,
  "noteId": "xxx"
}
```

## Example

### Basic publish

```
xhs_publish_content({
  title: "Today's Share",
  content: "Content here...",
  images: ["/path/to/image1.jpg", "/path/to/image2.jpg"]
})
```

### Save as draft

```
xhs_publish_content({
  title: "Draft Title",
  content: "Save now, publish later...",
  images: ["/path/to/image.jpg"],
  saveDraft: true
})
```

### With tags

```
xhs_publish_content({
  title: "OOTD",
  content: "Today's outfit...",
  images: ["/path/to/ootd.jpg"],
  tags: ["fashion", "daily", "style"]
})
```

### Scheduled publish

```
xhs_publish_content({
  title: "Good Morning",
  content: "...",
  images: ["/path/to/image.jpg"],
  scheduleTime: "2024-01-20T08:00:00+08:00"
})
```

### Multi-account

```
xhs_publish_content({
  title: "...",
  content: "...",
  images: [...],
  accounts: ["acc1", "acc2"]
})
```

## Notes

- Image paths must be absolute
- Title max 20 characters
- Requires visible browser window
- Drafts are saved to Xiaohongshu Creator Center
