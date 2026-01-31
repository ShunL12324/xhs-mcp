# xhs_create_draft

Create a note draft.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Note title (max 20 characters) |
| `content` | string | Yes | Note content |
| `images` | string[] | Yes | Array of image paths |
| `tags` | string[] | No | Topic tags |

## Response

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "title": "Note title",
  "imageCount": 3
}
```

## Example

```
xhs_create_draft({
  title: "Today's Coffee",
  content: "Tried a new coffee shop today...",
  images: ["/path/to/image1.png", "/path/to/image2.png"],
  tags: ["coffee", "cafe"]
})
```

## Notes

- Drafts are saved to local database
- Use `xhs_publish_draft` to publish
- Image paths can be AI-generated or local images
