# xhs_get_account_stats

Get account operation statistics.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |

## Response

```json
{
  "totalOperations": 150,
  "successfulOperations": 145,
  "failedOperations": 5,
  "successRate": 96.67,
  "operationsByAction": {
    "search": 50,
    "get_note": 40,
    "like": 30,
    "favorite": 15,
    "comment": 10,
    "publish_content": 5
  },
  "lastOperation": "2024-01-15T12:30:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `totalOperations` | number | Total operations |
| `successfulOperations` | number | Successful count |
| `failedOperations` | number | Failed count |
| `successRate` | number | Success rate (percentage) |
| `operationsByAction` | object | Breakdown by action type |
| `lastOperation` | string | Last operation time |

## Example

```
xhs_get_account_stats({ account: "main" })
```

## Use Cases

- Monitor account health
- Check if success rate is declining (session may have expired)
- Understand operation distribution
