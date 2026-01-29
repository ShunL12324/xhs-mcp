# xhs_list_accounts

列出所有注册的小红书账号。

## 参数

无参数。

## 返回值

```json
[
  {
    "id": "uuid-1",
    "name": "主账号",
    "status": "active",
    "proxy": null,
    "hasSession": true,
    "lastActivity": "2024-01-15T12:00:00Z"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 账号 UUID |
| `name` | string | 账号名称 |
| `status` | string | 状态：active / suspended / banned |
| `proxy` | string? | 代理地址 |
| `hasSession` | boolean | 是否有有效会话 |
| `lastActivity` | string | 最后活动时间 |

## 示例

```
xhs_list_accounts()
```
