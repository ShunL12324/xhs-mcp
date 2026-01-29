# xhs_list_feeds

获取首页推荐内容。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 使用的账号 |

## 返回值

```json
{
  "feeds": [
    {
      "id": "note-id",
      "xsecToken": "token",
      "title": "笔记标题",
      "cover": "封面URL",
      "type": "image",
      "user": {
        "id": "user-id",
        "nickname": "用户名"
      },
      "likes": 1234
    }
  ]
}
```

## 示例

```
xhs_list_feeds()
```

## 说明

- 返回个性化推荐内容
- 每次调用可能返回不同结果
- 返回的 `xsecToken` 可用于后续操作
