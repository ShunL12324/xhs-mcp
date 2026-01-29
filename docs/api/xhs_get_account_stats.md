# xhs_get_account_stats

获取账号操作统计。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 账号名称或 ID |

## 返回值

```json
{
  "totalOperations": 150,
  "successfulOperations": 145,
  "failedOperations": 5,
  "successRate": 96.67,
  "operationsByAction": {
    "search": 50,
    "get_note": 40,
    "like": 30,
    "favorite": 15,
    "comment": 10,
    "publish_content": 5
  },
  "lastOperation": "2024-01-15T12:30:00Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalOperations` | number | 总操作次数 |
| `successfulOperations` | number | 成功次数 |
| `failedOperations` | number | 失败次数 |
| `successRate` | number | 成功率（百分比） |
| `operationsByAction` | object | 按操作类型统计 |
| `lastOperation` | string | 最后操作时间 |

## 示例

```
xhs_get_account_stats({ account: "主账号" })
```

## 使用场景

- 监控账号健康状态
- 检查成功率是否下降（可能会话过期或被限制）
- 了解操作分布
