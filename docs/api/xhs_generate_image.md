# xhs_generate_image

使用 Gemini AI 生成图片。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | 是 | 图片描述 |
| `style` | string | 否 | 图片风格 |
| `aspectRatio` | string | 否 | 宽高比 |
| `subject` | string | 否 | 主体描述 |
| `environment` | string | 否 | 环境/背景 |
| `lighting` | string | 否 | 光线描述 |
| `mood` | string | 否 | 氛围/情绪 |
| `colorPalette` | string | 否 | 色彩风格 |
| `shotType` | string | 否 | 拍摄角度 |

### style 图片风格

| 值 | 说明 |
|----|------|
| `photo` | 真实照片风格（默认） |
| `illustration` | 插画风格 |
| `product` | 产品摄影 |
| `minimalist` | 极简风格 |
| `sticker` | 贴纸风格 |

### aspectRatio 宽高比

| 值 | 说明 |
|----|------|
| `3:4` | 竖版（默认，适合小红书） |
| `1:1` | 正方形 |
| `4:3` | 横版 |

### shotType 拍摄角度

| 值 | 说明 |
|----|------|
| `close-up` | 特写 |
| `medium shot` | 中景 |
| `wide shot` | 全景 |
| `macro` | 微距 |
| `aerial` | 俯拍 |
| `low-angle` | 低角度 |
| `high-angle` | 高角度 |

## 返回值

```json
{
  "success": true,
  "imagePath": "/path/to/generated/image.png",
  "prompt": "使用的完整 prompt"
}
```

## 示例

### 基本生成

```
xhs_generate_image({
  prompt: "一杯拿铁咖啡"
})
```

### 高级生成

```
xhs_generate_image({
  prompt: "咖啡拉花艺术",
  style: "photo",
  aspectRatio: "3:4",
  subject: "一杯精美的拿铁咖啡",
  environment: "温馨的咖啡店",
  lighting: "柔和的自然光",
  mood: "温暖舒适",
  shotType: "close-up"
})
```

## 注意事项

- 需要设置 `GEMINI_API_KEY` 环境变量
- 生成的图片保存在本地临时目录
- 可配合 `xhs_create_draft` 创建草稿
