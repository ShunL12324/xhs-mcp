# xhs_check_login

Check if account is logged in.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID |

If not specified and only one account exists, uses that account.

## Response

```json
{
  "loggedIn": true,
  "userId": "xxx",
  "nickname": "Username"
}
```

Or not logged in:

```json
{
  "loggedIn": false
}
```

## Example

```
xhs_check_login({ account: "main" })
```
