# xhs_add_account

开始登录流程，返回二维码 URL 和会话 ID。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 否 | 账号名称。如已存在则触发重新登录。不提供则使用登录后的昵称 |
| `proxy` | string | 否 | 代理服务器地址（如 `http://127.0.0.1:7890`） |

## 返回值

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

### 字段说明

| 字段 | 说明 |
|------|------|
| `sessionId` | 会话 ID，用于后续的 `xhs_check_login_session` 和 `xhs_submit_verification` |
| `status` | 当前状态，初始为 `waiting_scan` |
| `qrCodeUrl` | 二维码图片 URL，可直接在浏览器打开或发送给用户 |
| `remainingTime` | 二维码剩余有效时间（秒），通常为 120 秒 |
| `nextAction` | 下一步操作提示 |

## 登录流程

```
1. xhs_add_account           → 获取 sessionId 和 qrCodeUrl
   ↓
2. 用户扫描二维码
   ↓
3. xhs_check_login_session(sessionId) → 检查状态：
   - waiting_scan: 未扫描，继续等待
   - scanned: 已扫描，处理中
   - verification_required: 需要短信验证码 → 调用 xhs_submit_verification
   - success: 登录成功，账号已创建
   - expired: 二维码过期（2分钟），需重新开始
   ↓
4. xhs_submit_verification(sessionId, code) → 如需验证
   - 验证码 1 分钟内有效
   - 成功后返回 'success'
```

## 示例

### 添加新账号

```
xhs_add_account({})
```

返回二维码 URL 后，展示给用户扫描，然后调用 `xhs_check_login_session` 检查状态。

### 指定账号名称

```
xhs_add_account({ name: "我的账号" })
```

### 使用代理

```
xhs_add_account({
  name: "代理账号",
  proxy: "http://127.0.0.1:7890"
})
```

### 重新登录已有账号

```
xhs_add_account({ name: "已有账号名称" })
```

如果账号已存在，会清除旧会话并开始新的登录流程。

## 注意事项

- 二维码有效期为 **2 分钟**
- 二维码 URL 通过 api.qrserver.com 生成，可远程访问
- 扫码后必须调用 `xhs_check_login_session` 完成登录流程
- 登录成功后会话自动持久化到数据库
