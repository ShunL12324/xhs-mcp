# xhs_add_account

Start login process, returns QR code URL and session ID.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Account name. If exists, triggers re-login. If not provided, uses nickname from login |
| `proxy` | string | No | Proxy server URL (e.g., `http://127.0.0.1:7890`) |

## Response

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "waiting_scan",
  "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/...",
  "remainingTime": 120,
  "nextAction": "Show QR code URL to user. After scanning, call xhs_check_login_session with this sessionId."
}
```

### Fields

| Field | Description |
|-------|-------------|
| `sessionId` | Session ID for subsequent `xhs_check_login_session` and `xhs_submit_verification` calls |
| `status` | Current status, initially `waiting_scan` |
| `qrCodeUrl` | QR code image URL, can be opened in browser or sent to user |
| `remainingTime` | Remaining QR code validity (seconds), typically 120 seconds |
| `nextAction` | Next action hint |

## Login Flow

```
1. xhs_add_account           → Get sessionId and qrCodeUrl
   ↓
2. User scans QR code
   ↓
3. xhs_check_login_session(sessionId) → Check status:
   - waiting_scan: Not scanned, keep waiting
   - scanned: Scanned, processing
   - verification_required: SMS code needed → call xhs_submit_verification
   - success: Login complete, account created
   - expired: QR expired (2 min), start over
   ↓
4. xhs_submit_verification(sessionId, code) → If verification needed
   - Code valid for 1 minute
   - Returns 'success' on completion
```

## Examples

### Add new account

```
xhs_add_account({})
```

After getting QR code URL, show it to user, then call `xhs_check_login_session` to check status.

### With account name

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

### Re-login existing account

```
xhs_add_account({ name: "existing-account-name" })
```

If account exists, clears old session and starts new login flow.

## Notes

- QR code valid for **2 minutes**
- QR code URL generated via api.qrserver.com, accessible remotely
- Must call `xhs_check_login_session` after scanning to complete login
- Session automatically persisted to database on success
