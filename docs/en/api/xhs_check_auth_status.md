# xhs_check_auth_status

Check if an account is currently logged in to Xiaohongshu. If logged in, syncs user profile (nickname, userId, etc.) to database.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID. If not specified and only one account exists, uses that |

## Response

### Logged in

```json
{
  "account": "my-account",
  "loggedIn": true,
  "message": "Logged in as Username",
  "userInfo": {
    "userId": "xxx",
    "redId": "xxx",
    "nickname": "Username"
  },
  "profileSynced": true,
  "accountNameUpdated": false,
  "hint": "You can now use other xhs tools."
}
```

### Not logged in

```json
{
  "account": "my-account",
  "loggedIn": false,
  "message": "Not logged in",
  "hint": "Please use xhs_add_account to login."
}
```

### Fields

| Field | Description |
|-------|-------------|
| `loggedIn` | Whether the account is logged in |
| `userInfo` | Logged in user info (only when logged in) |
| `profileSynced` | Whether profile was synced to database |
| `accountNameUpdated` | Whether account name was updated to nickname |
| `hint` | Next action hint |

## Examples

### Check specific account

```
xhs_check_auth_status({ account: "my-account" })
```

### Auto-select account

```
xhs_check_auth_status({})
```

If only one account exists, it will be used automatically.

## Difference from xhs_check_login_session

| Tool | Purpose |
|------|---------|
| `xhs_check_login_session` | Check status during QR code login flow, requires sessionId |
| `xhs_check_auth_status` | Check if a saved account is still logged in |

## Notes

- If account name is a default name (e.g., `manual-import`), it will be updated to nickname after login
- Status check automatically syncs user profile to `account_profiles` table
- This tool does not trigger a new login flow, only checks existing session
