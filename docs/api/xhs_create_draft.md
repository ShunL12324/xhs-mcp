# xhs_create_draft

从截图和文本内容创建笔记草稿。AI 自动生成小红书风格的配图（封面、截图标注、文字卡片）。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 笔记标题（最多 20 字） |
| `content` | string | 是 | 笔记正文（纯文本，不要使用 Markdown 语法） |
| `screenshots` | string[] | 是 | 截图路径数组，AI 会自动处理和标注 |
| `tags` | string[] | 否 | 话题标签 |
| `style` | string | 否 | 视觉风格：`minimal`（默认）、`colorful`、`dark`、`light` |

## 返回值

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "title": "笔记标题",
  "imageCount": 7,
  "images": ["/path/to/cover.png", "/path/to/step1.png", ...]
}
```

## 示例

### 基础用法

```
xhs_create_draft({
  title: "VS Code 快捷键教程",
  content: "第一步：打开设置...\n第二步：搜索快捷键...",
  screenshots: ["/path/to/screenshot1.png", "/path/to/screenshot2.png"]
})
```

### 带标签和风格

```
xhs_create_draft({
  title: "Claude Code Plan Mode 完全指南",
  content: "什么是 Plan Mode？\n\nPlan Mode 是一种先思考后执行的模式...",
  screenshots: ["/path/to/ss1.png", "/path/to/ss2.png"],
  tags: ["编程", "AI", "工具"],
  style: "minimal"
})
```

## AI 处理流程

1. **分析阶段**：AI 分析截图内容，提取关键信息
2. **布局规划**：规划配图数量和类型（封面、截图、文字卡片）
3. **图像处理**：对截图进行标注、裁剪、美化
4. **质量检查**：检查配图质量和顺序，自动调整

## 注意事项

- 草稿保存在本地数据库，使用 `xhs_publish_draft` 发布
- **正文使用纯文本**，不要使用 Markdown 语法（小红书不支持）
- 截图会被 AI 自动处理，无需手动编辑
- 需要配置 `GEMINI_API_KEY` 用于 AI 处理
