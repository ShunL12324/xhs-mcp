# xhs_remove_account

Remove an account and all its data.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |

## Response

```json
{
  "success": true
}
```

## Example

```
xhs_remove_account({ account: "old-account" })
```

## Notes

- Cannot be undone
- Deletes session data and operation logs
