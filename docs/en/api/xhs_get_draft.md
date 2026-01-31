# xhs_get_draft

Get draft details.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draftId` | string | Yes | Draft ID |

## Response

```json
{
  "id": "draft-uuid",
  "title": "Note title",
  "content": "Full note content...",
  "images": ["/path/to/image1.png", "/path/to/image2.png"],
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "published": false
}
```

## Example

```
xhs_get_draft({ draftId: "draft-uuid" })
```
