# xhs_get_operation_logs

查询操作日志。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 账号名称或 ID |
| `action` | string | 否 | 按操作类型过滤 |
| `limit` | number | 否 | 返回数量（默认 50，最大 500） |
| `offset` | number | 否 | 跳过前 N 条记录 |

### 操作类型

| 类型 | 说明 |
|------|------|
| `search` | 搜索 |
| `get_note` | 获取笔记 |
| `user_profile` | 获取用户资料 |
| `list_feeds` | 获取推荐 |
| `like` | 点赞 |
| `unlike` | 取消点赞 |
| `favorite` | 收藏 |
| `unfavorite` | 取消收藏 |
| `comment` | 评论 |
| `reply` | 回复 |
| `publish_content` | 发布图文 |
| `publish_video` | 发布视频 |
| `download_images` | 下载图片 |
| `download_video` | 下载视频 |

## 返回值

```json
{
  "logs": [
    {
      "id": 1234,
      "accountId": "uuid",
      "action": "search",
      "targetId": null,
      "params": { "keyword": "美食" },
      "result": { "count": 20 },
      "success": true,
      "error": null,
      "durationMs": 3500,
      "createdAt": "2024-01-15T12:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

## 示例

### 获取所有日志

```
xhs_get_operation_logs({
  account: "主账号",
  limit: 100
})
```

### 按类型过滤

```
xhs_get_operation_logs({
  account: "主账号",
  action: "like"
})
```

### 分页查询

```
xhs_get_operation_logs({
  account: "主账号",
  limit: 50,
  offset: 50
})
```

## 使用场景

- 查看操作历史
- 调试失败的操作
- 审计账号活动
