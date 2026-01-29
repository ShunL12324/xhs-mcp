# xhs_check_login

检查账号是否已登录。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 账号名称或 ID |

如果不指定且只有一个账号，自动使用该账号。

## 返回值

```json
{
  "loggedIn": true,
  "userId": "xxx",
  "nickname": "用户昵称"
}
```

或未登录：

```json
{
  "loggedIn": false
}
```

## 示例

```
xhs_check_login({ account: "主账号" })
```
