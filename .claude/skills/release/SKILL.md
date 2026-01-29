---
name: release
description: Release a new version - auto-detect bump type, tag, commit, push and create GitHub Release to trigger npm publish (project)
user-invocable: true
allowed-tools: Bash, Read, Edit
---

# Release Skill

Automates the release process for the xhs-mcp package with intelligent version detection.

## Version Detection Rules

Analyze changes since the last tag to determine version bump:

### Major (x.0.0) - Breaking changes
- Removing or renaming MCP tools
- Changing tool parameter names or types
- Removing features or changing behavior incompatibly
- Keywords in commits: "BREAKING", "breaking change", "major"

### Minor (0.x.0) - New features
- Adding new MCP tools
- Adding new optional parameters to existing tools
- New functionality that's backward compatible
- Keywords in commits: "feat:", "feature", "add"
- New files in `src/tools/`

### Patch (0.0.x) - Bug fixes and small changes
- Bug fixes
- Documentation updates
- Refactoring without API changes
- Keywords in commits: "fix:", "chore:", "docs:", "refactor:", "style:"

## Workflow

1. **Get last tag and current version**
2. **Analyze changes** since last tag using git log and diff
3. **Auto-detect version bump** based on commit messages and file changes
4. **Bump version** in package.json
5. **Commit** with release message
6. **Create git tag** with v prefix
7. **Push** commits and tags to trigger GitHub Actions

## Instructions

When the user invokes `/release`:

1. Get current version and last tag:
   ```bash
   node -p "require('./package.json').version"
   git describe --tags --abbrev=0 2>/dev/null || echo "none"
   ```

2. Get commit messages since last tag:
   ```bash
   git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD --oneline
   ```

3. Analyze the commits and determine version bump:
   - If any commit contains "BREAKING" or major API changes → **major**
   - If commits contain "feat:" or new tools/features → **minor**
   - Otherwise → **patch**

4. Calculate new version:
   - Parse current version (e.g., "1.0.1")
   - Apply bump type to get new version

5. Update package.json using Edit tool

6. Commit and tag:
   ```bash
   git add package.json
   git commit -m "chore: release v{NEW_VERSION}"
   git tag v{NEW_VERSION}
   ```

7. Push:
   ```bash
   git push && git push --tags
   ```

8. Create GitHub Release (triggers npm publish workflow):
   ```bash
   gh release create v{NEW_VERSION} --title "v{NEW_VERSION}" --notes "Release v{NEW_VERSION}"
   ```

9. Report results:
   ```
   Changes detected: {summary}
   Version bump: {type} ({old} → {new})

   Committed: chore: release v{new}
   Tagged: v{new}
   Pushed to remote.
   GitHub Release created: v{new}

   npm publish workflow triggered: https://github.com/ShunL12324/xhs-mcp/actions
   ```

## Example

```
Analyzing changes since v1.0.0...

Commits:
- feat: add xhs_publish_video tool
- fix: handle empty search results
- chore: update dependencies

Detected: New feature added (feat:)
Version bump: minor (1.0.0 → 1.1.0)

✓ Updated package.json
✓ Committed: chore: release v1.1.0
✓ Tagged: v1.1.0
✓ Pushed to remote
✓ GitHub Release created

npm publish workflow triggered: https://github.com/ShunL12324/xhs-mcp/actions
```
