# xhs_explore

AI-driven explore page auto-browsing with human-like behavior.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account to use |
| `duration` | number | No | Run duration in seconds (default: 60, max: 600) |
| `interests` | string[] | No | Interest keywords to guide AI note selection |
| `openRate` | number | No | Probability of opening a note (0-1, default: 0.5) |
| `likeRate` | number | No | Probability of liking (0-1, default: 0.5) |
| `commentRate` | number | No | Probability of commenting (0-1, default: 0.1) |

## Response

```json
{
  "account": "account-name",
  "success": true,
  "sessionId": "session-uuid",
  "duration": 60,
  "stats": {
    "scrolls": 15,
    "notesViewed": 8,
    "likes": 4,
    "comments": 1
  },
  "actions": [
    {
      "type": "scroll",
      "time": "2024-01-01T00:00:00Z"
    },
    {
      "type": "open_note",
      "noteId": "xxx",
      "title": "Note title",
      "time": "2024-01-01T00:00:05Z"
    },
    {
      "type": "like",
      "noteId": "xxx",
      "time": "2024-01-01T00:00:10Z"
    }
  ]
}
```

## Examples

### Basic browsing

```
xhs_explore({ duration: 120 })
```

### Targeted browsing

```
xhs_explore({
  duration: 300,
  interests: ["coffee", "food", "cafe"],
  likeRate: 0.7,
  commentRate: 0.2
})
```

### Conservative mode

```
xhs_explore({
  duration: 60,
  openRate: 0.3,
  likeRate: 0.2,
  commentRate: 0
})
```

## Features

- **Smart scrolling**: Simulates human scrolling (2-3 scrolls then pause)
- **AI selection**: Selects notes based on interest keywords
- **Probability interactions**: Decides to like/comment based on set probabilities
- **AI comments**: Generates natural comment content
- **Deduplication**: Won't view the same note twice
- **Full logging**: All actions logged to database

## Notes

- Set reasonable duration to avoid excessive browsing
- Keep commentRate low (under 0.1)
- All actions recorded in `explore_sessions` and `explore_actions` tables
- Requires `GEMINI_API_KEY` for AI comment generation
