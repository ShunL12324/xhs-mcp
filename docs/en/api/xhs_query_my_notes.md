# xhs_query_my_notes

Query cached published notes with multi-field filtering.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID |
| `type` | string | No | Note type: normal/video |
| `level` | number | No | Note level |
| `sticky` | boolean | No | Pinned status |
| `permissionCode` | number | No | Permission: 0=public |
| `titleContains` | string | No | Title contains text |
| `minLikes` | number | No | Minimum likes |
| `minCollected` | number | No | Minimum collects |
| `minComments` | number | No | Minimum comments |
| `minViews` | number | No | Minimum views |
| `publishTimeStart` | string | No | Publish time start |
| `publishTimeEnd` | string | No | Publish time end |
| `orderBy` | string | No | Sort field |
| `orderDir` | string | No | Sort direction: asc/desc |
| `limit` | number | No | Result limit (default: 100) |
| `offset` | number | No | Pagination offset (default: 0) |
| `includeStats` | boolean | No | Include summary statistics |

### orderBy options

| Value | Description |
|-------|-------------|
| `publish_time` | Publish time (default) |
| `likes` | Likes count |
| `collected_count` | Collects count |
| `comments_count` | Comments count |
| `view_count` | Views count |
| `updated_at` | Update time |

## Response

```json
{
  "account": "account-name",
  "success": true,
  "count": 10,
  "total": 50,
  "lastFetchTime": "2024-01-01T00:00:00Z",
  "notes": [...],
  "stats": {
    "totalNotes": 50,
    "totalViews": 50000,
    "totalLikes": 5000
  }
}
```

## Examples

### Query top-liked notes

```
xhs_query_my_notes({
  minLikes: 100,
  orderBy: "likes",
  orderDir: "desc"
})
```

### Query by date range

```
xhs_query_my_notes({
  publishTimeStart: "2024-01-01",
  publishTimeEnd: "2024-01-31"
})
```

### Search by title

```
xhs_query_my_notes({
  titleContains: "coffee"
})
```

## Notes

- Requires `xhs_get_my_notes` to fetch and cache data first
- Queries run on local database for fast results
