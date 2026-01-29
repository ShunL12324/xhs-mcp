# xhs_submit_verification

Submit SMS verification code to complete login. Only call when `xhs_check_login` returns `verification_required` status.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from `xhs_add_account` |
| `code` | string | Yes | 6-digit SMS verification code |

## Response

### Verification successful

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
  "message": "Verification successful. Account created.",
  "nextAction": null
}
```

### Incorrect code

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "verification_required",
  "error": "Verification code incorrect. Please try again.",
  "remainingTime": 30,
  "nextAction": "SMS verification required. Ask user for the 6-digit code..."
}
```

### Code expired

```json
{
  "success": false,
  "sessionId": "sess_xxxxxxxx",
  "status": "failed",
  "error": "Verification code expired (1 minute limit).",
  "nextAction": "Call xhs_add_account to start a new login."
}
```

### SMS rate limited

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "verification_required",
  "rateLimited": true,
  "rateLimitMessage": "SMS rate limit reached for today. Try again tomorrow.",
  "nextAction": "..."
}
```

## Example

```
xhs_submit_verification({
  sessionId: "sess_abc12345",
  code: "123456"
})
```

## Notes

- Verification code valid for **1 minute**
- Can retry on incorrect code, but within validity period
- Xiaohongshu has daily SMS limits, `rateLimited: true` indicates limit reached
- Account automatically created and saved on success
