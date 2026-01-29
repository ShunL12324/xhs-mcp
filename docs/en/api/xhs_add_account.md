# xhs_add_account

Add a new account or re-login an existing account.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Account name |
| `proxy` | string | No | Proxy server URL |

## Response

```json
{
  "success": true,
  "accountId": "uuid",
  "qrCodeUrl": "https://...",
  "message": "Please scan QR code to login"
}
```

## Login Flow

1. Call this tool with account name
2. System launches headless browser and captures login QR code
3. Returns temporary URL of QR code image
4. Scan with Xiaohongshu App
5. Session saved automatically after login

## Example

### Add new account

```
xhs_add_account({ name: "my-account" })
```

### With proxy

```
xhs_add_account({
  name: "proxy-account",
  proxy: "http://127.0.0.1:7890"
})
```

### Re-login

If account exists, triggers re-login:

```
xhs_add_account({ name: "existing-account" })
```

## Notes

- QR code URL has limited validity
- Session persists to database
- Re-login required when session expires
