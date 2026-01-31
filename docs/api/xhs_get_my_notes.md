# xhs_get_my_notes

从创作者中心获取已发布笔记列表，并缓存到本地数据库。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 使用的账号 |
| `tab` | number | 否 | 筛选：0=全部，1=公开，2=私密（默认 0） |
| `limit` | number | 否 | 获取数量（默认 100，最大 500） |
| `timeout` | number | 否 | 超时时间（毫秒，默认 60000） |

## 返回值

```json
{
  "account": "账号名",
  "success": true,
  "count": 50,
  "cached": true,
  "notes": [
    {
      "id": "note-id",
      "type": "normal",
      "title": "笔记标题",
      "time": "2024-01-01T00:00:00Z",
      "cover": "封面URL",
      "stats": {
        "views": 1000,
        "likes": 100,
        "comments": 20,
        "collects": 50,
        "shares": 10
      },
      "level": 0,
      "permission": "public",
      "sticky": false,
      "xsecToken": "token"
    }
  ]
}
```

### level 笔记等级

| 值 | 说明 |
|----|------|
| 0 | 正常 |
| 1 | 流量中 |
| 2 | 待审核 |
| 3 | 未通过 |
| 4 | 仅自己可见 |

## 示例

```
xhs_get_my_notes()
```

```
xhs_get_my_notes({ tab: 1, limit: 200 })
```

## 注意事项

- 数据会自动缓存到本地数据库
- 使用 `xhs_query_my_notes` 查询缓存数据
- 获取大量数据时建议增加 timeout
