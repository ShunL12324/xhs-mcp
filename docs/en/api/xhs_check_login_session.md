# xhs_check_login_session

Check login status and complete the login process. Call after user scans QR code.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from `xhs_add_account` |

## Response

### Waiting for scan

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "waiting_scan",
  "qrCodeUrl": "https://...",
  "remainingTime": 90,
  "nextAction": "Show QR code URL to user. After scanning, call xhs_check_login_session with this sessionId."
}
```

### Scanned, processing

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "scanned",
  "nextAction": "QR code scanned. Call xhs_check_login_session again to check if login is complete."
}
```

### SMS verification required

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "verification_required",
  "phone": "+86 189******35",
  "remainingTime": 60,
  "nextAction": "SMS verification required. Ask user for the 6-digit code, then call xhs_submit_verification within 60 seconds."
}
```

### Login successful

```json
{
  "success": true,
  "status": "success",
  "account": {
    "id": "acc_xxxxxxxx",
    "name": "Username",
    "status": "active"
  },
  "userInfo": {
    "userId": "xxx",
    "redId": "xxx",
    "nickname": "Username"
  },
  "message": "Login successful. Account created.",
  "nextAction": null
}
```

### QR code expired

```json
{
  "success": false,
  "sessionId": "sess_xxxxxxxx",
  "status": "expired",
  "error": "QR code expired. Please start a new login session.",
  "nextAction": "Session expired. Call xhs_add_account to start a new login."
}
```

## Status Values

| Status | Description |
|--------|-------------|
| `waiting_scan` | QR code not scanned, keep waiting or call again |
| `scanned` | Scanned, processing, call again to check |
| `verification_required` | SMS code needed, call `xhs_submit_verification` |
| `success` | Login successful, account created |
| `expired` | Session expired, call `xhs_add_account` to restart |
| `failed` | Login failed |

## Examples

### Check login status

```
xhs_check_login_session({ sessionId: "sess_abc12345" })
```

### Polling

```javascript
// Pseudocode
while (status === 'waiting_scan' || status === 'scanned') {
  await sleep(2000);  // Check every 2 seconds
  result = xhs_check_login_session({ sessionId });
  status = result.status;
}
```

## Notes

- Account automatically created and saved on successful login
- If `verification_required` returned, must submit code within 1 minute
- QR code valid for 2 minutes
- Recommended polling interval: 2-3 seconds
