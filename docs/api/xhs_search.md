# xhs_search

搜索小红书笔记。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 是 | 搜索关键词 |
| `count` | number | 否 | 返回数量（默认 20，最大 500） |
| `sortBy` | string | 否 | 排序方式 |
| `noteType` | string | 否 | 笔记类型 |
| `publishTime` | string | 否 | 发布时间范围 |
| `searchScope` | string | 否 | 搜索范围 |
| `timeout` | number | 否 | 超时时间（毫秒，默认 60000） |
| `account` | string | 否 | 使用的账号 |

### sortBy 排序方式

| 值 | 说明 |
|----|------|
| `general` | 综合排序（默认） |
| `latest` | 最新发布 |
| `most_liked` | 最多点赞 |
| `most_commented` | 最多评论 |
| `most_collected` | 最多收藏 |

### noteType 笔记类型

| 值 | 说明 |
|----|------|
| `all` | 全部（默认） |
| `video` | 仅视频 |
| `image` | 仅图文 |

### publishTime 发布时间

| 值 | 说明 |
|----|------|
| `all` | 全部时间（默认） |
| `day` | 最近一天 |
| `week` | 最近一周 |
| `half_year` | 最近半年 |

### searchScope 搜索范围

| 值 | 说明 |
|----|------|
| `all` | 全部（默认） |
| `viewed` | 已看过 |
| `not_viewed` | 未看过 |
| `following` | 关注的人 |

## 返回值

```json
{
  "notes": [
    {
      "id": "note-id",
      "xsecToken": "token",
      "title": "笔记标题",
      "cover": "封面URL",
      "type": "image",
      "user": {
        "id": "user-id",
        "nickname": "用户名",
        "avatar": "头像URL"
      },
      "likes": 1234
    }
  ],
  "total": 100
}
```

## 示例

### 基本搜索

```
xhs_search({ keyword: "美食推荐" })
```

### 高级搜索

```
xhs_search({
  keyword: "护肤",
  count: 50,
  sortBy: "most_liked",
  noteType: "image",
  publishTime: "week"
})
```

## 注意事项

- `xsecToken` 用于后续获取笔记详情和互动操作
- 搜索大量结果时建议增加 `timeout`
