# xhs_user_profile

Get user profile.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |
| `xsecToken` | string | No | Security token |
| `account` | string | No | Account to use |

## Response

```json
{
  "id": "user-id",
  "nickname": "Username",
  "avatar": "Avatar URL",
  "desc": "Bio",
  "gender": "female",
  "location": "Shanghai",
  "stats": {
    "follows": 100,
    "fans": 5000,
    "notes": 50,
    "likes": 10000
  },
  "notes": [
    {
      "id": "note-id",
      "title": "Note title",
      "cover": "Cover URL",
      "likes": 123
    }
  ]
}
```

## Example

```
xhs_user_profile({ userId: "xxx" })
```
