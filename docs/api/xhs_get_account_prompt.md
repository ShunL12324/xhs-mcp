# xhs_get_account_prompt

获取账号的 Prompt 文件内容。Prompt 用于控制 explore 时 AI 的行为（笔记选择和评论生成）。

## 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 账号名称或 ID |
| `type` | string | 是 | Prompt 类型：`persona`（人设）、`select`（选择笔记）、`comment`（生成评论） |

## 返回值

```json
{
  "account": "我的账号",
  "promptType": "persona",
  "content": "普通小红书用户，对有趣、有用、有共鸣的内容感兴趣。\n评论风格自然真诚，简短有力。"
}
```

## Prompt 类型说明

| 类型 | 说明 | 文件 |
|------|------|------|
| `persona` | 基础人设，定义用户特征和评论风格 | `persona.txt` |
| `select` | 选择笔记的 Prompt 模板，使用 `{{ persona }}` 和 `{{ notes }}` 变量 | `select.txt` |
| `comment` | 生成评论的 Prompt 模板，使用 `{{ persona }}`、`{{ title }}`、`{{ content }}` 变量 | `comment.txt` |

## 文件存储

Prompt 文件存储在 `~/.xhs-mcp/prompts/{accountName}_{accountId}/` 目录下。

首次调用时会自动创建默认文件，用户可直接编辑这些文件或使用 `xhs_set_account_prompt` 修改。

## 示例

### 获取人设

```
xhs_get_account_prompt({
  account: "我的账号",
  type: "persona"
})
```

### 获取评论 Prompt

```
xhs_get_account_prompt({
  account: "我的账号",
  type: "comment"
})
```

## 相关工具

- [xhs_set_account_prompt](/api/xhs_set_account_prompt) - 更新 Prompt 内容
- [xhs_explore](/api/xhs_explore) - 自动浏览（使用这些 Prompt）
