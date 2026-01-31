# xhs_set_account_prompt

Update the prompt file content for an account. Use this to customize AI behavior during explore.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |
| `type` | string | Yes | Prompt type: `persona` (character), `select` (note selection), `comment` (comment generation) |
| `content` | string | Yes | New prompt content. For select/comment, use `{{ persona }}` to reference the persona |

## Response

```json
{
  "success": true,
  "account": "my-account",
  "promptType": "persona",
  "message": "Prompt \"persona\" updated successfully."
}
```

## Template Variables

Prompts use [LiquidJS](https://liquidjs.com/) template syntax (Jinja2 style).

### Select Template Variables

| Variable | Description |
|----------|-------------|
| `{{ persona }}` | Auto-injected content from persona.txt |
| `{{ notes }}` | List of currently visible notes |
| `{{ interests }}` | User-specified interest keywords (if any) |

### Comment Template Variables

| Variable | Description |
|----------|-------------|
| `{{ persona }}` | Auto-injected content from persona.txt |
| `{{ title }}` | Note title |
| `{{ content }}` | Note content |

## Examples

### Set Persona

```
xhs_set_account_prompt({
  account: "food-blogger",
  type: "persona",
  content: "Food blogger who loves restaurant reviews and home cooking.\nComment style: enthusiastic, professional, occasionally sharing tips."
})
```

### Custom Comment Prompt

```
xhs_set_account_prompt({
  account: "food-blogger",
  type: "comment",
  content: `<system>
You are a Xiaohongshu user viewing a note and about to comment.
</system>

<persona>
{{ persona }}
</persona>

<note>
<title>{{ title }}</title>
<content>{{ content }}</content>
</note>

<task>
Write a comment in your style for this note.
If it's food-related, you can ask about location or price.
</task>

<output_format>
Return JSON: {"comment": "comment content"}
</output_format>`
})
```

## Notes

- Changes take effect immediately, next explore will use the new prompt
- Recommended to get default template first using `xhs_get_account_prompt` as reference
- Prompt files can also be edited directly in the file system

## Related Tools

- [xhs_get_account_prompt](/en/api/xhs_get_account_prompt) - Get prompt content
- [xhs_explore](/en/api/xhs_explore) - Auto-browse (uses these prompts)
