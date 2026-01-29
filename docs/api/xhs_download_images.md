# xhs_download_images

下载笔记中的所有图片。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteId` | string | 是 | 笔记 ID |
| `xsecToken` | string | 是 | 安全令牌 |
| `account` | string | 否 | 使用的账号 |

## 返回值

```json
{
  "success": true,
  "noteId": "xxx",
  "images": [
    "/Users/xxx/.xhs-mcp/downloads/images/xxx/1.jpg",
    "/Users/xxx/.xhs-mcp/downloads/images/xxx/2.jpg"
  ],
  "count": 2
}
```

## 示例

```
xhs_download_images({
  noteId: "abc123",
  xsecToken: "token"
})
```

## 存储位置

图片保存在：
```
~/.xhs-mcp/downloads/images/{noteId}/
```
