# xhs_query_my_notes

查询本地缓存的已发布笔记，支持多条件筛选。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 账号名或 ID |
| `type` | string | 否 | 笔记类型：normal/video |
| `level` | number | 否 | 笔记等级 |
| `sticky` | boolean | 否 | 是否置顶 |
| `permissionCode` | number | 否 | 权限代码：0=公开 |
| `titleContains` | string | 否 | 标题包含文字 |
| `minLikes` | number | 否 | 最少点赞数 |
| `minCollected` | number | 否 | 最少收藏数 |
| `minComments` | number | 否 | 最少评论数 |
| `minViews` | number | 否 | 最少浏览数 |
| `publishTimeStart` | string | 否 | 发布时间起始 |
| `publishTimeEnd` | string | 否 | 发布时间截止 |
| `orderBy` | string | 否 | 排序字段 |
| `orderDir` | string | 否 | 排序方向：asc/desc |
| `limit` | number | 否 | 返回数量（默认 100） |
| `offset` | number | 否 | 分页偏移（默认 0） |
| `includeStats` | boolean | 否 | 是否包含统计信息 |

### orderBy 排序字段

| 值 | 说明 |
|----|------|
| `publish_time` | 发布时间（默认） |
| `likes` | 点赞数 |
| `collected_count` | 收藏数 |
| `comments_count` | 评论数 |
| `view_count` | 浏览数 |
| `updated_at` | 更新时间 |

## 返回值

```json
{
  "account": "账号名",
  "success": true,
  "count": 10,
  "total": 50,
  "lastFetchTime": "2024-01-01T00:00:00Z",
  "notes": [...],
  "stats": {
    "totalNotes": 50,
    "totalViews": 50000,
    "totalLikes": 5000
  }
}
```

## 示例

### 查询高赞笔记

```
xhs_query_my_notes({
  minLikes: 100,
  orderBy: "likes",
  orderDir: "desc"
})
```

### 按时间范围查询

```
xhs_query_my_notes({
  publishTimeStart: "2024-01-01",
  publishTimeEnd: "2024-01-31"
})
```

### 搜索标题

```
xhs_query_my_notes({
  titleContains: "咖啡"
})
```

## 注意事项

- 需要先调用 `xhs_get_my_notes` 获取并缓存数据
- 查询在本地数据库执行，速度快
