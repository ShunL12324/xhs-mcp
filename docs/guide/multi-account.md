# 多账号管理

v2.0 支持多账号同时操作，每个账号独立管理会话和代理配置。

## 账号操作

### 列出所有账号

```
xhs_list_accounts()
```

返回：
```json
[
  {
    "id": "uuid-1",
    "name": "主账号",
    "status": "active",
    "hasSession": true,
    "lastActivity": "2024-01-15T12:00:00Z"
  },
  {
    "id": "uuid-2",
    "name": "备用账号",
    "status": "active",
    "hasSession": true,
    "lastActivity": "2024-01-15T11:30:00Z"
  }
]
```

### 添加账号

```
xhs_add_account({ name: "新账号" })
```

如果账号已存在，会触发重新登录。

### 修改账号配置

```
xhs_set_account_config({
  account: "主账号",
  name: "改名后的账号",      // 可选：修改名称
  proxy: "http://proxy:8080", // 可选：设置代理
  status: "suspended"         // 可选：暂停账号
})
```

### 删除账号

```
xhs_remove_account({ account: "旧账号" })
```

## 指定账号操作

所有工具都支持 `account` 参数：

```
xhs_search({ keyword: "美食", account: "主账号" })
xhs_get_note({ noteId: "xxx", xsecToken: "yyy", account: "备用账号" })
```

如果不指定且只有一个账号，自动使用该账号。

## 多账号批量操作

互动类工具支持 `accounts` 参数：

### 指定多个账号

```
xhs_like_feed({
  noteId: "xxx",
  xsecToken: "yyy",
  accounts: ["账号1", "账号2", "账号3"]
})
```

### 使用所有活跃账号

```
xhs_like_feed({
  noteId: "xxx",
  xsecToken: "yyy",
  accounts: "all"
})
```

### 批量操作返回结果

```json
[
  {
    "account": "账号1",
    "success": true,
    "result": { "action": "like", "noteId": "xxx" },
    "durationMs": 2500
  },
  {
    "account": "账号2",
    "success": true,
    "result": { "action": "like", "noteId": "xxx" },
    "durationMs": 2300
  },
  {
    "account": "账号3",
    "success": false,
    "error": "Rate limited",
    "durationMs": 1500
  }
]
```

## 账号状态

| 状态 | 说明 |
|------|------|
| `active` | 正常使用 |
| `suspended` | 暂停使用（不参与 "all" 操作） |
| `banned` | 已封禁 |

## 并发保护

同一账号同时只能执行一个操作，防止会话冲突。如果账号正在使用，会返回错误：

```
Account "xxx" is currently in use
```
