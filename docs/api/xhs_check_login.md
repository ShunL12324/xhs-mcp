# xhs_check_login

检查登录状态并完成登录流程。在用户扫描二维码后调用。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sessionId` | string | 是 | 来自 `xhs_add_account` 的会话 ID |

## 返回值

### 等待扫描

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "waiting_scan",
  "qrCodeUrl": "https://...",
  "remainingTime": 90,
  "nextAction": "Show QR code URL to user. After scanning, call xhs_check_login with this sessionId."
}
```

### 已扫描，处理中

```json
{
  "success": true,
  "sessionId": "sess_xxxxxxxx",
  "status": "scanned",
  "nextAction": "QR code scanned. Call xhs_check_login again to check if login is complete."
}
```

### 需要短信验证

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

### 登录成功

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
  "message": "Login successful. Account created.",
  "nextAction": null
}
```

### 二维码过期

```json
{
  "success": false,
  "sessionId": "sess_xxxxxxxx",
  "status": "expired",
  "error": "QR code expired. Please start a new login session.",
  "nextAction": "Session expired. Call xhs_add_account to start a new login."
}
```

## 状态值说明

| 状态 | 说明 |
|------|------|
| `waiting_scan` | 二维码未扫描，继续等待或再次调用检查 |
| `scanned` | 已扫描，正在处理，请再次调用检查 |
| `verification_required` | 需要短信验证码，调用 `xhs_submit_verification` |
| `success` | 登录成功，账号已创建 |
| `expired` | 会话过期，需调用 `xhs_add_account` 重新开始 |
| `failed` | 登录失败 |

## 示例

### 检查登录状态

```
xhs_check_login({ sessionId: "sess_abc12345" })
```

### 轮询检查

```javascript
// 伪代码示例
while (status === 'waiting_scan' || status === 'scanned') {
  await sleep(2000);  // 每 2 秒检查一次
  result = xhs_check_login({ sessionId });
  status = result.status;
}
```

## 注意事项

- 登录成功后账号自动创建并保存到数据库
- 如果返回 `verification_required`，必须在 1 分钟内提交验证码
- 二维码有效期为 2 分钟
- 建议每 2-3 秒轮询一次检查状态
