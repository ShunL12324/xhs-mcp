# xhs_explore

AI 驱动的探索页自动浏览，模拟真实用户行为。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 使用的账号 |
| `duration` | number | 否 | 运行时长（秒，默认 60，最大 600） |
| `interests` | string[] | 否 | 兴趣关键词，指导 AI 选择笔记 |
| `openRate` | number | 否 | 打开笔记的概率（0-1，默认 0.5） |
| `likeRate` | number | 否 | 点赞概率（0-1，默认 0.5） |
| `commentRate` | number | 否 | 评论概率（0-1，默认 0.1） |

## 返回值

```json
{
  "account": "账号名",
  "success": true,
  "sessionId": "session-uuid",
  "duration": 60,
  "stats": {
    "scrolls": 15,
    "notesViewed": 8,
    "likes": 4,
    "comments": 1
  },
  "actions": [
    {
      "type": "scroll",
      "time": "2024-01-01T00:00:00Z"
    },
    {
      "type": "open_note",
      "noteId": "xxx",
      "title": "笔记标题",
      "time": "2024-01-01T00:00:05Z"
    },
    {
      "type": "like",
      "noteId": "xxx",
      "time": "2024-01-01T00:00:10Z"
    }
  ]
}
```

## 示例

### 基本浏览

```
xhs_explore({ duration: 120 })
```

### 定向浏览

```
xhs_explore({
  duration: 300,
  interests: ["咖啡", "美食", "探店"],
  likeRate: 0.7,
  commentRate: 0.2
})
```

### 保守模式

```
xhs_explore({
  duration: 60,
  openRate: 0.3,
  likeRate: 0.2,
  commentRate: 0
})
```

## 功能说明

- **智能滚动**：模拟人类滚动行为（2-3 次滚动后暂停阅读）
- **AI 选择**：根据 interests 关键词智能选择感兴趣的笔记
- **概率互动**：基于设定概率决定是否点赞、评论
- **AI 评论**：自动生成自然的评论内容
- **去重机制**：同一笔记不会重复查看
- **完整日志**：所有操作记录到数据库

## 注意事项

- 建议设置合理的 duration，避免过长
- commentRate 建议设置较低值（0.1 以下）
- 所有操作记录在 `explore_sessions` 和 `explore_actions` 表中
- 需要 `GEMINI_API_KEY` 用于 AI 评论生成
