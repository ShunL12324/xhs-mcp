# xhs_search

Search Xiaohongshu notes.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | Yes | Search keyword |
| `count` | number | No | Result count (default 20, max 500) |
| `sortBy` | string | No | Sort method |
| `noteType` | string | No | Note type |
| `publishTime` | string | No | Publish time range |
| `searchScope` | string | No | Search scope |
| `timeout` | number | No | Timeout in ms (default 60000) |
| `account` | string | No | Account to use |

### sortBy

| Value | Description |
|-------|-------------|
| `general` | General (default) |
| `latest` | Latest |
| `most_liked` | Most liked |
| `most_commented` | Most commented |
| `most_collected` | Most collected |

### noteType

| Value | Description |
|-------|-------------|
| `all` | All (default) |
| `video` | Video only |
| `image` | Image only |

### publishTime

| Value | Description |
|-------|-------------|
| `all` | All time (default) |
| `day` | Last day |
| `week` | Last week |
| `half_year` | Last 6 months |

### searchScope

| Value | Description |
|-------|-------------|
| `all` | All (default) |
| `viewed` | Viewed |
| `not_viewed` | Not viewed |
| `following` | Following |

## Response

```json
{
  "notes": [
    {
      "id": "note-id",
      "xsecToken": "token",
      "title": "Note title",
      "cover": "Cover URL",
      "type": "image",
      "user": {
        "id": "user-id",
        "nickname": "Username",
        "avatar": "Avatar URL"
      },
      "likes": 1234
    }
  ],
  "total": 100
}
```

## Example

### Basic search

```
xhs_search({ keyword: "food" })
```

### Advanced search

```
xhs_search({
  keyword: "skincare",
  count: 50,
  sortBy: "most_liked",
  noteType: "image",
  publishTime: "week"
})
```

## Notes

- `xsecToken` is used for subsequent note details and interactions
- Increase `timeout` when searching large results
