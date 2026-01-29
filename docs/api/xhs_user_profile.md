# xhs_user_profile

获取用户资料。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 用户 ID |
| `xsecToken` | string | 否 | 安全令牌 |
| `account` | string | 否 | 使用的账号 |

## 返回值

```json
{
  "id": "user-id",
  "nickname": "用户昵称",
  "avatar": "头像URL",
  "desc": "个人简介",
  "gender": "female",
  "location": "上海",
  "stats": {
    "follows": 100,
    "fans": 5000,
    "notes": 50,
    "likes": 10000
  },
  "notes": [
    {
      "id": "note-id",
      "title": "笔记标题",
      "cover": "封面URL",
      "likes": 123
    }
  ]
}
```

## 示例

```
xhs_user_profile({ userId: "xxx" })
```
