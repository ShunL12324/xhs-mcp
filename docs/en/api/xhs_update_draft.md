# xhs_update_draft

Update draft content.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draftId` | string | Yes | Draft ID |
| `title` | string | No | New title |
| `content` | string | No | New content |
| `images` | string[] | No | New images (replaces existing) |
| `tags` | string[] | No | New tags |

## Response

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "updatedFields": ["title", "content"]
}
```

## Examples

### Update title

```
xhs_update_draft({
  draftId: "draft-uuid",
  title: "New Title"
})
```

### Update multiple fields

```
xhs_update_draft({
  draftId: "draft-uuid",
  title: "New Title",
  content: "New content...",
  tags: ["new-tag"]
})
```
