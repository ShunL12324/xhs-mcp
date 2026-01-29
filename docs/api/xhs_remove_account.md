# xhs_remove_account

删除账号及其所有数据。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 账号名称或 ID |

## 返回值

```json
{
  "success": true
}
```

## 示例

```
xhs_remove_account({ account: "旧账号" })
```

## 注意事项

- 删除后无法恢复
- 会同时删除会话数据和操作日志
