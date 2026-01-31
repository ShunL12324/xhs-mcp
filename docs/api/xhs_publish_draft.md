# xhs_publish_draft

将草稿发布到小红书。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `draftId` | string | 是 | 草稿 ID |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号发布 |
| `scheduleTime` | string | 否 | 定时发布时间（ISO 8601 格式） |

## 返回值

### 单账号

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "noteId": "published-note-id"
}
```

### 多账号

```json
[
  {
    "account": "账号1",
    "success": true,
    "noteId": "note-id-1"
  },
  {
    "account": "账号2",
    "success": true,
    "noteId": "note-id-2"
  }
]
```

## 示例

### 立即发布

```
xhs_publish_draft({
  draftId: "draft-uuid"
})
```

### 多账号发布

```
xhs_publish_draft({
  draftId: "draft-uuid",
  accounts: ["账号1", "账号2"]
})
```

### 定时发布

```
xhs_publish_draft({
  draftId: "draft-uuid",
  scheduleTime: "2024-01-15T10:00:00Z"
})
```

## 注意事项

- 发布后草稿会标记为已发布状态
- 多账号发布会使用相同的内容
