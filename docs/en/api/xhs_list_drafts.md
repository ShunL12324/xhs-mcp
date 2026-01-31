# xhs_list_drafts

List all note drafts.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includePublished` | boolean | No | Include published drafts (default: false) |

## Response

```json
{
  "drafts": [
    {
      "id": "draft-uuid",
      "title": "Note title",
      "content": "Content preview...",
      "imageCount": 3,
      "tags": ["tag1", "tag2"],
      "createdAt": "2024-01-01T00:00:00Z",
      "published": false
    }
  ],
  "total": 5
}
```

## Examples

### List unpublished drafts

```
xhs_list_drafts()
```

### List all drafts

```
xhs_list_drafts({ includePublished: true })
```
