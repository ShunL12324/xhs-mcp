# xhs_list_drafts

列出所有笔记草稿。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `includePublished` | boolean | 否 | 是否包含已发布的草稿（默认 false） |

## 返回值

```json
{
  "drafts": [
    {
      "id": "draft-uuid",
      "title": "笔记标题",
      "content": "笔记内容摘要...",
      "imageCount": 3,
      "tags": ["标签1", "标签2"],
      "createdAt": "2024-01-01T00:00:00Z",
      "published": false
    }
  ],
  "total": 5
}
```

## 示例

### 列出未发布的草稿

```
xhs_list_drafts()
```

### 列出所有草稿

```
xhs_list_drafts({ includePublished: true })
```
