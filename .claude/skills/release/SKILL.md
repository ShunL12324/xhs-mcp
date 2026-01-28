---
name: release
description: Release a new version - bump version, tag, commit and push to trigger npm publish (project)
user-invocable: true
allowed-tools: Bash, AskUserQuestion, Read, Edit
---

# Release Skill

This skill automates the release process for the xhs-mcp package.

## Workflow

1. **Get current version** from package.json
2. **Ask user** for version bump type (patch, minor, major)
3. **Bump version** in package.json using npm version (without git tag, we'll do it manually)
4. **Commit** the version change
5. **Create git tag** with the new version (v prefix)
6. **Push** commits and tags to remote
7. The push will trigger GitHub Actions to publish to npm

## Instructions

When the user invokes `/release`:

1. Read the current version from package.json:
   ```bash
   node -p "require('./package.json').version"
   ```

2. Ask the user which version bump they want using AskUserQuestion:
   - patch (1.0.0 -> 1.0.1)
   - minor (1.0.0 -> 1.1.0)
   - major (1.0.0 -> 2.0.0)

3. Calculate the new version and update package.json using Edit tool

4. Commit the change:
   ```bash
   git add package.json
   git commit -m "chore: release v{NEW_VERSION}"
   ```

5. Create the tag:
   ```bash
   git tag v{NEW_VERSION}
   ```

6. Push with tags:
   ```bash
   git push && git push --tags
   ```

7. Inform the user that the release has been triggered and provide the GitHub Actions URL.

## Example Output

```
Current version: 1.0.0
New version: 1.0.1 (patch)

Committed: chore: release v1.0.1
Tagged: v1.0.1
Pushed to remote.

GitHub Actions will now publish v1.0.1 to npm.
Check progress: https://github.com/ShunL12324/xhs-mcp/actions
```
