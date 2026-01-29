# xhs_publish_video

Publish video note or save as draft.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Title (max 20 chars) |
| `content` | string | Yes | Video description |
| `videoPath` | string | Yes | Absolute video file path |
| `coverPath` | string | No | Cover image path |
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
xhs_publish_video({
  title: "My Vlog",
  content: "Today's daily...",
  videoPath: "/path/to/video.mp4"
})
```

### Save as draft

```
xhs_publish_video({
  title: "Video Draft",
  content: "Edit later...",
  videoPath: "/path/to/video.mp4",
  saveDraft: true
})
```

### Custom cover

```
xhs_publish_video({
  title: "Travel Log",
  content: "...",
  videoPath: "/path/to/travel.mp4",
  coverPath: "/path/to/cover.jpg"
})
```

### With tags

```
xhs_publish_video({
  title: "Tutorial",
  content: "...",
  videoPath: "/path/to/tutorial.mp4",
  tags: ["tutorial", "tips", "learning"]
})
```

## Notes

- Video path must be absolute
- Requires visible browser window
- Large videos take longer to upload
- Drafts are saved to Xiaohongshu Creator Center
