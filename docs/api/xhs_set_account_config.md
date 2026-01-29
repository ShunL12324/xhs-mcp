# xhs_set_account_config

修改账号配置。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 账号名称或 ID |
| `name` | string | 否 | 新名称 |
| `proxy` | string | 否 | 代理地址（空字符串清除代理） |
| `status` | string | 否 | 状态：active / suspended / banned |

## 返回值

```json
{
  "success": true
}
```

## 示例

### 修改名称

```
xhs_set_account_config({
  account: "旧名称",
  name: "新名称"
})
```

### 设置代理

```
xhs_set_account_config({
  account: "主账号",
  proxy: "http://127.0.0.1:7890"
})
```

### 清除代理

```
xhs_set_account_config({
  account: "主账号",
  proxy: ""
})
```

### 暂停账号

```
xhs_set_account_config({
  account: "备用账号",
  status: "suspended"
})
```

## 账号状态说明

| 状态 | 说明 |
|------|------|
| `active` | 正常状态，可以使用 |
| `suspended` | 暂停状态，不参与 "all" 批量操作 |
| `banned` | 已封禁 |
