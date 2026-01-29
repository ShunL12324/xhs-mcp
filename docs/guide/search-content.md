# 内容查询

## 搜索笔记

### 基本搜索

```
xhs_search({ keyword: "美食推荐" })
```

### 搜索参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索关键词（必填） |
| `count` | number | 返回数量（默认 20，最大 500） |
| `sortBy` | string | 排序方式 |
| `noteType` | string | 笔记类型 |
| `publishTime` | string | 发布时间 |
| `account` | string | 使用的账号 |

### 排序方式 (sortBy)

| 值 | 说明 |
|----|------|
| `general` | 综合排序（默认） |
| `latest` | 最新发布 |
| `most_liked` | 最多点赞 |
| `most_commented` | 最多评论 |
| `most_collected` | 最多收藏 |

### 笔记类型 (noteType)

| 值 | 说明 |
|----|------|
| `all` | 全部（默认） |
| `video` | 仅视频 |
| `image` | 仅图文 |

### 发布时间 (publishTime)

| 值 | 说明 |
|----|------|
| `all` | 全部时间（默认） |
| `day` | 最近一天 |
| `week` | 最近一周 |
| `half_year` | 最近半年 |

### 完整示例

```
xhs_search({
  keyword: "护肤",
  count: 50,
  sortBy: "most_liked",
  noteType: "image",
  publishTime: "week"
})
```

## 获取笔记详情

```
xhs_get_note({
  noteId: "xxx",
  xsecToken: "yyy"
})
```

::: tip xsecToken
`xsecToken` 从搜索结果中获取，用于验证访问权限。每个笔记都有对应的 token。
:::

### 返回内容

- 标题、正文、标签
- 图片/视频列表
- 点赞、收藏、评论数
- 作者信息
- 评论列表

## 获取用户资料

```
xhs_user_profile({ userId: "xxx" })
```

返回：
- 用户基本信息
- 粉丝数、关注数
- 发布的笔记列表

## 获取首页推荐

```
xhs_list_feeds()
```

返回首页推荐的笔记列表，包含 `noteId` 和 `xsecToken`。
