# xhs_download_video

Download video from a note.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `account` | string | No | Account to use |

## Response

```json
{
  "success": true,
  "noteId": "xxx",
  "videoPath": "/Users/xxx/.xhs-mcp/downloads/videos/xxx/video.mp4"
}
```

## Example

```
xhs_download_video({
  noteId: "abc123",
  xsecToken: "token"
})
```

## Storage Location

Videos are saved to:
```
~/.xhs-mcp/downloads/videos/{noteId}/
```

## Notes

- Only works for video notes
- Use `xhs_download_images` for image notes
