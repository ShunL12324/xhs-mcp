# xhs_list_accounts

List all registered Xiaohongshu accounts.

## Parameters

None.

## Response

```json
[
  {
    "id": "uuid-1",
    "name": "main-account",
    "status": "active",
    "proxy": null,
    "hasSession": true,
    "lastActivity": "2024-01-15T12:00:00Z"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Account UUID |
| `name` | string | Account name |
| `status` | string | Status: active / suspended / banned |
| `proxy` | string? | Proxy address |
| `hasSession` | boolean | Whether has valid session |
| `lastActivity` | string | Last activity time |

## Example

```
xhs_list_accounts()
```
