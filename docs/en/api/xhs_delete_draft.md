# xhs_delete_draft

Delete a draft and its associated images.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draftId` | string | Yes | Draft ID |

## Response

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "deletedImages": 3
}
```

## Example

```
xhs_delete_draft({ draftId: "draft-uuid" })
```

## Notes

- Deletion is permanent
- Associated local image files are also deleted
