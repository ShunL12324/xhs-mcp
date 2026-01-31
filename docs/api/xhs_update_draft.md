# xhs_update_draft

更新草稿内容。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `draftId` | string | 是 | 草稿 ID |
| `title` | string | 否 | 新标题 |
| `content` | string | 否 | 新内容 |
| `images` | string[] | 否 | 新图片（替换原有图片） |
| `tags` | string[] | 否 | 新标签 |

## 返回值

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "updatedFields": ["title", "content"]
}
```

## 示例

### 更新标题

```
xhs_update_draft({
  draftId: "draft-uuid",
  title: "新标题"
})
```

### 更新多个字段

```
xhs_update_draft({
  draftId: "draft-uuid",
  title: "新标题",
  content: "新内容...",
  tags: ["新标签"]
})
```
