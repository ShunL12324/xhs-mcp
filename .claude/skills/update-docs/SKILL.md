---
name: update-docs
description: 根据 git 改动记录自动更新项目文档。分析最近的 commit 或指定范围的改动，更新 README、API 文档、CLAUDE.md 等。(project)
user-invocable: true
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Task
---

# 更新文档 Skill

根据 git 改动自动分析并更新项目文档。

## 触发方式

用户调用 `/update-docs` 或说"更新文档"、"同步文档"等。

## 参数解析

从用户输入中解析：
- `range`: commit 范围，如 `HEAD~3..HEAD`、`v2.3.0..v2.4.0`、具体 commit hash
- 默认：最近一次 commit (`HEAD~1..HEAD`)

示例：
- `/update-docs` → 分析最近一次 commit
- `/update-docs HEAD~5..HEAD` → 分析最近 5 次 commit
- `/update-docs v2.3.0..v2.4.0` → 分析版本间改动

## 执行流程

### 1. 获取改动信息

```bash
# 获取 commit 信息
git log --oneline <range>

# 获取改动的文件列表
git diff --name-only <range>

# 获取详细改动（针对关键文件）
git diff <range> -- src/tools/ src/xhs/clients/services/
```

### 2. 分析改动类型

根据改动文件判断需要更新的文档：

| 改动位置 | 需要更新的文档 |
|---------|---------------|
| `src/tools/*.ts` | `docs/api/`、`README.md` 工具表格 |
| `src/core/config.ts` | `CLAUDE.md` 环境变量、`README.md` 环境变量 |
| `src/xhs/clients/services/*.ts` | `docs/guide/`、功能说明 |
| `src/db/repos/*.ts` | `CLAUDE.md` 数据库架构 |
| `package.json` | 版本号、依赖说明 |

### 3. 文档更新清单

**核心文档：**
- `README.md` / `README.en.md` - 功能概览、工具列表、环境变量
- `CLAUDE.md` - 项目说明、架构、环境变量、开发指南
- `docs/index.md` / `docs/en/index.md` - 首页特性

**API 文档（每个工具一个文件）：**
- `docs/api/<tool_name>.md` - 中文 API 文档
- `docs/en/api/<tool_name>.md` - 英文 API 文档
- `docs/api/index.md` / `docs/en/api/index.md` - API 索引

**使用指南：**
- `docs/guide/*.md` - 功能使用指南

### 4. 更新规则

1. **新增工具**：
   - 在 `docs/api/index.md` 添加工具条目
   - 创建 `docs/api/<tool_name>.md` 文档
   - 在 `README.md` 工具表格中添加
   - 同步英文版本

2. **修改工具**：
   - 更新对应的 API 文档参数、示例
   - 检查 README 中的描述是否需要更新

3. **新增环境变量**：
   - 更新 `CLAUDE.md` 环境变量表
   - 更新 `README.md` / `README.en.md` 环境变量表

4. **架构变更**：
   - 更新 `CLAUDE.md` 项目结构和架构说明

### 5. API 文档模板

新工具的文档模板：

```markdown
# <tool_name>

<简短描述>

## 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `param1` | string | 是 | 描述 |
| `param2` | number | 否 | 描述（默认值：x） |

## 返回值

\`\`\`json
{
  "success": true,
  ...
}
\`\`\`

## 示例

### 基础用法

\`\`\`
<tool_name>({ param1: "value" })
\`\`\`

### 高级用法

\`\`\`
<tool_name>({
  param1: "value",
  param2: 100
})
\`\`\`

## 注意事项

- 要点 1
- 要点 2
```

### 6. 检查清单

完成后执行：

```bash
# 验证 VitePress 构建（检查死链接）
cd docs && bun run build 2>&1 | grep -i "dead link"
```

如果有死链接，创建缺失的文档文件。

## 输出

完成后输出：
1. 改动摘要（分析了哪些 commit）
2. 更新了哪些文档文件
3. 是否有需要手动检查的地方
