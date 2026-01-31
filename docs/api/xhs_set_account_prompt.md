# xhs_set_account_prompt

更新账号的 Prompt 文件内容。用于自定义 explore 时 AI 的行为。

## 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 账号名称或 ID |
| `type` | string | 是 | Prompt 类型：`persona`（人设）、`select`（选择笔记）、`comment`（生成评论） |
| `content` | string | 是 | 新的 Prompt 内容。select/comment 中可使用 `{{ persona }}` 引用人设 |

## 返回值

```json
{
  "success": true,
  "account": "我的账号",
  "promptType": "persona",
  "message": "Prompt \"persona\" updated successfully."
}
```

## 模板变量

Prompt 使用 [LiquidJS](https://liquidjs.com/) 模板语法（Jinja2 风格）。

### select 模板变量

| 变量 | 说明 |
|------|------|
| `{{ persona }}` | 自动注入 persona.txt 的内容 |
| `{{ notes }}` | 当前可见的笔记列表 |
| `{{ interests }}` | 用户指定的兴趣关键词（如有） |

### comment 模板变量

| 变量 | 说明 |
|------|------|
| `{{ persona }}` | 自动注入 persona.txt 的内容 |
| `{{ title }}` | 笔记标题 |
| `{{ content }}` | 笔记内容 |

## 示例

### 设置人设

```
xhs_set_account_prompt({
  account: "美食号",
  type: "persona",
  content: "美食博主，喜欢探店和家常菜。\n评论风格：热情、专业，偶尔分享小技巧。"
})
```

### 自定义评论 Prompt

```
xhs_set_account_prompt({
  account: "美食号",
  type: "comment",
  content: `<system>
你是一个小红书用户，正在查看一篇笔记并准备评论。
</system>

<persona>
{{ persona }}
</persona>

<note>
<title>{{ title }}</title>
<content>{{ content }}</content>
</note>

<task>
以你的风格为这篇笔记写一条评论。
如果是美食相关，可以问一下在哪里、多少钱等。
</task>

<output_format>
返回 JSON：{"comment": "评论内容"}
</output_format>`
})
```

## 注意事项

- 修改后立即生效，下次 explore 时会使用新的 Prompt
- 建议先用 `xhs_get_account_prompt` 获取默认模板作为参考
- Prompt 文件也可以直接在文件系统中编辑

## 相关工具

- [xhs_get_account_prompt](/api/xhs_get_account_prompt) - 获取 Prompt 内容
- [xhs_explore](/api/xhs_explore) - 自动浏览（使用这些 Prompt）
