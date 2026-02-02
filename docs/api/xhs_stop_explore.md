# xhs_stop_explore

停止正在运行的 explore 会话。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 账号名称或 ID |
| `sessionId` | string | 否 | 要停止的会话 ID，不指定则停止该账号所有活跃会话 |

## 返回值

```json
{
  "account": "账号名",
  "success": true,
  "stoppedSessions": ["session-uuid-1", "session-uuid-2"],
  "message": "Stopped 2 explore session(s)"
}
```

如果没有活跃会话：

```json
{
  "account": "账号名",
  "success": true,
  "stoppedSessions": [],
  "message": "No active explore sessions to stop"
}
```

## 示例

### 停止所有会话

```
xhs_stop_explore({ account: "我的账号" })
```

### 停止指定会话

```
xhs_stop_explore({
  account: "我的账号",
  sessionId: "abc123-session-id"
})
```

## 注意事项

- 会话会在完成当前操作后优雅停止
- 停止的会话状态会记录为 `stopped`
- 可通过 `xhs_get_operation_logs` 查看会话记录
