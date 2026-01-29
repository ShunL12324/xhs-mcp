# xhs_delete_cookies

删除账号的会话 Cookie。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 账号名称或 ID |

## 返回值

```json
{
  "success": true
}
```

## 示例

```
xhs_delete_cookies({ account: "主账号" })
```

## 使用场景

- 登出账号
- 会话异常需要重新登录
- 清理账号数据
