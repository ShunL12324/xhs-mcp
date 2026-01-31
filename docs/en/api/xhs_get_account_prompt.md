# xhs_get_account_prompt

Get the prompt file content for an account. Prompts control AI behavior during explore (note selection and comment generation).

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |
| `type` | string | Yes | Prompt type: `persona` (character), `select` (note selection), `comment` (comment generation) |

## Response

```json
{
  "account": "my-account",
  "promptType": "persona",
  "content": "A regular Xiaohongshu user interested in fun, useful, and relatable content.\nComment style: natural, sincere, short and impactful."
}
```

## Prompt Types

| Type | Description | File |
|------|-------------|------|
| `persona` | Base character definition, user traits and comment style | `persona.txt` |
| `select` | Note selection prompt template, uses `{{ persona }}` and `{{ notes }}` variables | `select.txt` |
| `comment` | Comment generation prompt template, uses `{{ persona }}`, `{{ title }}`, `{{ content }}` variables | `comment.txt` |

## File Storage

Prompt files are stored in `~/.xhs-mcp/prompts/{accountName}_{accountId}/` directory.

Default files are created automatically on first access. Users can edit these files directly or use `xhs_set_account_prompt`.

## Examples

### Get Persona

```
xhs_get_account_prompt({
  account: "my-account",
  type: "persona"
})
```

### Get Comment Prompt

```
xhs_get_account_prompt({
  account: "my-account",
  type: "comment"
})
```

## Related Tools

- [xhs_set_account_prompt](/en/api/xhs_set_account_prompt) - Update prompt content
- [xhs_explore](/en/api/xhs_explore) - Auto-browse (uses these prompts)
