# xhs_stop_explore

Stop a running explore session.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID |
| `sessionId` | string | No | Session ID to stop. If not provided, stops all active sessions for the account |

## Response

```json
{
  "account": "account-name",
  "success": true,
  "stoppedSessions": ["session-uuid-1", "session-uuid-2"],
  "message": "Stopped 2 explore session(s)"
}
```

If no active sessions:

```json
{
  "account": "account-name",
  "success": true,
  "stoppedSessions": [],
  "message": "No active explore sessions to stop"
}
```

## Examples

### Stop all sessions

```
xhs_stop_explore({ account: "my-account" })
```

### Stop specific session

```
xhs_stop_explore({
  account: "my-account",
  sessionId: "abc123-session-id"
})
```

## Notes

- Session will complete its current action before stopping gracefully
- Stopped sessions are recorded with status `stopped`
- Use `xhs_get_operation_logs` to view session history
