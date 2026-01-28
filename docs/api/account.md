# Account Management

Tools for managing Xiaohongshu accounts.

## xhs_list_accounts

List all registered accounts with their status and statistics.

### Parameters

None required.

### Response

```json
{
  "count": 2,
  "accounts": [
    {
      "id": "uuid",
      "name": "account-name",
      "status": "active",
      "proxy": null,
      "hasSession": true,
      "profile": {
        "nickname": "Display Name",
        "avatar": "https://..."
      },
      "stats": {
        "totalOperations": 42,
        "successRate": 98
      },
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "lastActiveAt": "2024-01-15T12:00:00Z",
      "isLocked": false
    }
  ]
}
```

---

## xhs_add_account

Add a new account or re-login an existing account via QR code.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Account name (unique identifier) |
| `proxy` | string | No | Proxy server URL |

### Behavior

1. Launches headless browser
2. Navigates to Xiaohongshu login page
3. Captures QR code and saves to file
4. Opens QR code in default image viewer
5. Waits for user to scan (up to 2 minutes)
6. Saves session to database

### Response

```json
{
  "success": true,
  "isNew": true,
  "account": {
    "id": "uuid",
    "name": "account-name",
    "status": "active",
    "proxy": null
  },
  "qrCodePath": "/path/to/qrcode.png",
  "message": "Account added and logged in successfully."
}
```

---

## xhs_remove_account

Remove an account and delete its session data.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |

### Response

```json
{
  "success": true,
  "message": "Account 'account-name' has been removed."
}
```

---

## xhs_set_account_config

Update account configuration.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |
| `name` | string | No | New name for the account |
| `proxy` | string | No | New proxy URL (empty string to remove) |
| `status` | string | No | `active`, `suspended`, or `banned` |

### Examples

Rename account:
```json
{ "account": "old-name", "name": "new-name" }
```

Set proxy:
```json
{ "account": "my-account", "proxy": "http://proxy:8080" }
```

Suspend account:
```json
{ "account": "my-account", "status": "suspended" }
```

### Response

```json
{
  "success": true,
  "account": {
    "id": "uuid",
    "name": "new-name",
    "status": "active",
    "proxy": null
  }
}
```

---

## xhs_check_login

Check if an account is currently logged in.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID |

### Response

```json
{
  "loggedIn": true,
  "message": "User is logged in."
}
```

---

## xhs_delete_cookies

Delete saved login cookies/session for an account.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID |

### Response

```json
{
  "success": true
}
```
