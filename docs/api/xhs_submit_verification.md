# xhs_submit_verification

提交短信验证码完成登录。仅在 `xhs_check_login` 返回 `verification_required` 状态时调用。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sessionId` | string | 是 | 来自 `xhs_add_account` 的会话 ID |
| `code` | string | 是 | 6 位短信验证码 |

## 返回值

### 验证成功

```json
{
  "success": true,
  "status": "success",
  "account": {
    "id": "acc_xxxxxxxx",
    "name": "用户昵称",
    "status": "active"
  },
  "userInfo": {
    "userId": "xxx",
    "redId": "xxx",
    "nickname": "用户昵称"
  },
  "message": "Verification successful. Account created.",
  "nextAction": null
}
```

### 验证码错误

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

### 验证码过期

```json
{
  "success": false,
  "sessionId": "sess_xxxxxxxx",
  "status": "failed",
  "error": "Verification code expired (1 minute limit).",
  "nextAction": "Call xhs_add_account to start a new login."
}
```

### 短信发送限额

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

## 示例

```
xhs_submit_verification({
  sessionId: "sess_abc12345",
  code: "123456"
})
```

## 注意事项

- 验证码有效期为 **1 分钟**
- 验证码错误可以重试，但要在有效期内
- 小红书每日短信发送有限额，超出会返回 `rateLimited: true`
- 验证成功后账号自动创建并保存
