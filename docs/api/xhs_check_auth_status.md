# xhs_check_auth_status

检查账号是否已登录到小红书。如果已登录，会同步用户资料（昵称、userId 等）到数据库。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 账号名称或 ID。如果未指定且只有一个账号，则使用该账号 |

## 返回值

### 已登录

```json
{
  "account": "我的账号",
  "loggedIn": true,
  "message": "Logged in as 用户昵称",
  "userInfo": {
    "userId": "xxx",
    "redId": "xxx",
    "nickname": "用户昵称"
  },
  "profileSynced": true,
  "accountNameUpdated": false,
  "hint": "You can now use other xhs tools."
}
```

### 未登录

```json
{
  "account": "我的账号",
  "loggedIn": false,
  "message": "Not logged in",
  "hint": "Please use xhs_add_account to login."
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `loggedIn` | 是否已登录 |
| `userInfo` | 登录用户信息（已登录时返回） |
| `profileSynced` | 用户资料是否已同步到数据库 |
| `accountNameUpdated` | 账号名称是否已更新为昵称 |
| `hint` | 下一步操作提示 |

## 示例

### 检查指定账号

```
xhs_check_auth_status({ account: "my-account" })
```

### 自动选择账号

```
xhs_check_auth_status({})
```

如果只有一个账号，会自动使用该账号。

## 与 xhs_check_login_session 的区别

| 工具 | 用途 |
|------|------|
| `xhs_check_login_session` | 扫码登录流程中检查状态，需要 sessionId |
| `xhs_check_auth_status` | 检查已保存的账号是否仍处于登录状态 |

## 注意事项

- 如果账号名是默认名称（如 `manual-import`），登录后会自动更新为昵称
- 登录状态检查会自动同步用户资料到 `account_profiles` 表
- 此工具不会触发新的登录流程，只检查现有会话
