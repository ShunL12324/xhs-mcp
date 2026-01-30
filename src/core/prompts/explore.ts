/**
 * @fileoverview Explore 功能的 AI Prompts
 * @module core/prompts/explore
 */

/**
 * 从当前屏幕笔记中选择感兴趣的一篇
 * 输入变量: notes (笔记列表), interests (兴趣关键词)
 */
export const SELECT_NOTE_PROMPT = `你正在浏览小红书首页。以下是当前屏幕上的笔记：

{notes}

用户感兴趣的话题：{interests}

请从中选择 1 篇你觉得最值得点开查看的笔记。考虑因素：
- 标题是否有趣、有吸引力
- 与用户兴趣的相关性
- 点赞数可以参考但不是唯一标准

返回 JSON 格式（不要包含 markdown 代码块）：
{"noteId": "选中的笔记ID", "reason": "选择理由（简短）"}

如果没有感兴趣的笔记，返回：
{"noteId": null, "reason": "没有感兴趣的内容"}`;

/**
 * 生成评论内容
 * 输入变量: title, content
 */
export const GENERATE_COMMENT_PROMPT = `你正在查看一篇小红书笔记，需要写一条评论。

笔记标题：{title}
笔记内容：{content}

请写一条自然、真诚的评论，要求：
- 像普通用户一样，不要太正式
- 简短（10-30字）
- 可以是赞美、提问、或分享感受
- 不要用过于夸张的语气

返回 JSON 格式（不要包含 markdown 代码块）：
{"comment": "你的评论内容"}`;

/**
 * 替换 prompt 中的变量
 */
export function formatPrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
