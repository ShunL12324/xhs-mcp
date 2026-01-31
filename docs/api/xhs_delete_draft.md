# xhs_delete_draft

删除草稿及其关联的图片。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `draftId` | string | 是 | 草稿 ID |

## 返回值

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "deletedImages": 3
}
```

## 示例

```
xhs_delete_draft({ draftId: "draft-uuid" })
```

## 注意事项

- 删除操作不可恢复
- 会同时删除草稿关联的本地图片文件
