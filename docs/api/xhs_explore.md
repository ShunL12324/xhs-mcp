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
| `deduplicate` | boolean | 否 | 跨会话去重（默认 true），排除之前互动过的笔记 |

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

- **智能滚动**：模拟人类滚动行为（1-3 次滚动后暂停阅读）
- **随机行为**：10% 概率快速滑过、5% 概率倒回查看、15% 概率快速关闭笔记
- **AI 选择**：根据 interests 关键词和账号 persona 智能选择笔记
- **概率互动**：基于设定概率决定是否点赞、评论
- **智能点赞**：AI 选择点赞帖子本身还是某条评论（可自定义 like-target prompt）
- **AI 评论**：使用账号的 comment prompt 生成自然评论
- **跨会话去重**：默认排除之前已互动过的笔记
- **完整日志**：所有操作记录到数据库

## Prompt 自定义

explore 使用账号的 Prompt 文件控制 AI 行为：

| Prompt | 说明 |
|--------|------|
| `persona` | 定义用户特征和评论风格 |
| `select` | 控制如何选择笔记 |
| `comment` | 控制如何生成评论 |
| `like-target` | 控制点赞目标选择（帖子/评论/不点赞） |

使用 [xhs_get_account_prompt](/api/xhs_get_account_prompt) 和 [xhs_set_account_prompt](/api/xhs_set_account_prompt) 管理 Prompt。

## 注意事项

- 建议设置合理的 duration，避免过长
- commentRate 建议设置较低值（0.1 以下）
- 所有操作记录在 `explore_sessions` 和 `explore_actions` 表中
- 需要 `GEMINI_API_KEY` 用于 AI 评论生成
