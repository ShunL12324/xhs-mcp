# xhs_generate_image

Generate images using Gemini AI.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Image description |
| `style` | string | No | Image style |
| `aspectRatio` | string | No | Aspect ratio |
| `subject` | string | No | Subject description |
| `environment` | string | No | Environment/background |
| `lighting` | string | No | Lighting description |
| `mood` | string | No | Mood/atmosphere |
| `colorPalette` | string | No | Color scheme |
| `shotType` | string | No | Camera shot type |

### style options

| Value | Description |
|-------|-------------|
| `photo` | Photorealistic (default) |
| `illustration` | Illustration style |
| `product` | Product photography |
| `minimalist` | Minimalist style |
| `sticker` | Sticker style |

### aspectRatio options

| Value | Description |
|-------|-------------|
| `3:4` | Portrait (default, ideal for Xiaohongshu) |
| `1:1` | Square |
| `4:3` | Landscape |

### shotType options

| Value | Description |
|-------|-------------|
| `close-up` | Close-up shot |
| `medium shot` | Medium shot |
| `wide shot` | Wide shot |
| `macro` | Macro photography |
| `aerial` | Aerial view |
| `low-angle` | Low angle |
| `high-angle` | High angle |

## Response

```json
{
  "success": true,
  "imagePath": "/path/to/generated/image.png",
  "prompt": "Full prompt used"
}
```

## Examples

### Basic generation

```
xhs_generate_image({
  prompt: "A cup of latte coffee"
})
```

### Advanced generation

```
xhs_generate_image({
  prompt: "Latte art",
  style: "photo",
  aspectRatio: "3:4",
  subject: "A beautifully crafted latte",
  environment: "Cozy coffee shop",
  lighting: "Soft natural light",
  mood: "Warm and inviting",
  shotType: "close-up"
})
```

## Notes

- Requires `GEMINI_API_KEY` environment variable
- Generated images are saved to local temp directory
- Use with `xhs_create_draft` to create drafts
