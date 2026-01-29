# xhs_list_feeds

Get homepage recommended content.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account to use |

## Response

```json
{
  "feeds": [
    {
      "id": "note-id",
      "xsecToken": "token",
      "title": "Note title",
      "cover": "Cover URL",
      "type": "image",
      "user": {
        "id": "user-id",
        "nickname": "Username"
      },
      "likes": 1234
    }
  ]
}
```

## Example

```
xhs_list_feeds()
```

## Notes

- Returns personalized recommendations
- Results may vary between calls
- `xsecToken` can be used for subsequent operations
