# xhs_get_draft

获取草稿详情。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `draftId` | string | 是 | 草稿 ID |

## 返回值

```json
{
  "id": "draft-uuid",
  "title": "笔记标题",
  "content": "完整的笔记内容...",
  "images": ["/path/to/image1.png", "/path/to/image2.png"],
  "tags": ["标签1", "标签2"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "published": false
}
```

## 示例

```
xhs_get_draft({ draftId: "draft-uuid" })
```
