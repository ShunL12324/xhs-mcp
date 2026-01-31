# xhs_get_my_notes

Fetch published notes from Creator Center and cache to local database.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account to use |
| `tab` | number | No | Filter: 0=all, 1=public, 2=private (default: 0) |
| `limit` | number | No | Number to fetch (default: 100, max: 500) |
| `timeout` | number | No | Timeout in ms (default: 60000) |

## Response

```json
{
  "account": "account-name",
  "success": true,
  "count": 50,
  "cached": true,
  "notes": [
    {
      "id": "note-id",
      "type": "normal",
      "title": "Note Title",
      "time": "2024-01-01T00:00:00Z",
      "cover": "cover-url",
      "stats": {
        "views": 1000,
        "likes": 100,
        "comments": 20,
        "collects": 50,
        "shares": 10
      },
      "level": 0,
      "permission": "public",
      "sticky": false,
      "xsecToken": "token"
    }
  ]
}
```

### level values

| Value | Description |
|-------|-------------|
| 0 | Normal |
| 1 | In traffic |
| 2 | Pending review |
| 3 | Not approved |
| 4 | Self-only visible |

## Examples

```
xhs_get_my_notes()
```

```
xhs_get_my_notes({ tab: 1, limit: 200 })
```

## Notes

- Data is automatically cached to local database
- Use `xhs_query_my_notes` to query cached data
- Increase timeout when fetching large amounts
