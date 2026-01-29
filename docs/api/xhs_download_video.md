# xhs_download_video

下载笔记中的视频。

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
  "videoPath": "/Users/xxx/.xhs-mcp/downloads/videos/xxx/video.mp4"
}
```

## 示例

```
xhs_download_video({
  noteId: "abc123",
  xsecToken: "token"
})
```

## 存储位置

视频保存在：
```
~/.xhs-mcp/downloads/videos/{noteId}/
```

## 注意事项

- 仅对视频类型笔记有效
- 图文笔记请使用 `xhs_download_images`
