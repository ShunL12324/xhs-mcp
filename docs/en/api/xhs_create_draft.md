# xhs_create_draft

Create a note draft from screenshots and text content. AI automatically generates Xiaohongshu-style images (cover, annotated screenshots, text slides).

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Note title (max 20 characters) |
| `content` | string | Yes | Note content (plain text, do NOT use Markdown syntax) |
| `screenshots` | string[] | Yes | Array of screenshot paths, AI will process and annotate |
| `tags` | string[] | No | Topic tags |
| `style` | string | No | Visual style: `minimal` (default), `colorful`, `dark`, `light` |

## Response

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "title": "Note title",
  "imageCount": 7,
  "images": ["/path/to/cover.png", "/path/to/step1.png", ...]
}
```

## Examples

### Basic usage

```
xhs_create_draft({
  title: "VS Code Shortcuts Tutorial",
  content: "Step 1: Open settings...\nStep 2: Search for shortcuts...",
  screenshots: ["/path/to/screenshot1.png", "/path/to/screenshot2.png"]
})
```

### With tags and style

```
xhs_create_draft({
  title: "Claude Code Plan Mode Guide",
  content: "What is Plan Mode?\n\nPlan Mode is a think-before-act mode...",
  screenshots: ["/path/to/ss1.png", "/path/to/ss2.png"],
  tags: ["programming", "AI", "tools"],
  style: "minimal"
})
```

## AI Processing Pipeline

1. **Analysis phase**: AI analyzes screenshot content, extracts key information
2. **Layout planning**: Plans image count and types (cover, screenshots, text cards)
3. **Image processing**: Annotates, crops, and beautifies screenshots
4. **Quality check**: Checks image quality and order, auto-adjusts if needed

## Notes

- Drafts are saved to local database, use `xhs_publish_draft` to publish
- **Use plain text for content**, do NOT use Markdown syntax (Xiaohongshu doesn't support it)
- Screenshots are auto-processed by AI, no manual editing needed
- Requires `GEMINI_API_KEY` for AI processing
