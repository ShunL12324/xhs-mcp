# xhs_download_images

Download all images from a note.

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
  "images": [
    "/Users/xxx/.xhs-mcp/downloads/images/xxx/1.jpg",
    "/Users/xxx/.xhs-mcp/downloads/images/xxx/2.jpg"
  ],
  "count": 2
}
```

## Example

```
xhs_download_images({
  noteId: "abc123",
  xsecToken: "token"
})
```

## Storage Location

Images are saved to:
```
~/.xhs-mcp/downloads/images/{noteId}/
```
