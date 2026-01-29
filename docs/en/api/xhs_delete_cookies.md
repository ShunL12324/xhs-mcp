# xhs_delete_cookies

Delete account session cookies.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID |

## Response

```json
{
  "success": true
}
```

## Example

```
xhs_delete_cookies({ account: "main" })
```

## Use Cases

- Logout account
- Session error, need re-login
- Clean account data
