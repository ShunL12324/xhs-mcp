# API Overview

XHS-MCP provides a comprehensive set of MCP tools for interacting with Xiaohongshu.

## Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| [Account](/en/api/account) | 4 tools | Manage accounts, login, configuration |
| [Content](/en/api/content) | 5 tools | Search, fetch notes, user profiles |
| [Publish](/en/api/publish) | 2 tools | Post image and video notes |
| [Interaction](/en/api/interaction) | 5 tools | Like, favorite, comment, reply |
| [Statistics](/en/api/stats) | 2 tools | View operation logs and stats |

## All Tools

### Account Management
- `xhs_list_accounts` - List all registered accounts
- `xhs_add_account` - Add new account via QR login
- `xhs_remove_account` - Remove an account
- `xhs_set_account_config` - Update account name, proxy, or status

### Authentication
- `xhs_check_login` - Check login status
- `xhs_delete_cookies` - Clear session

### Content Query
- `xhs_search` - Search for notes
- `xhs_get_note` - Get note details
- `xhs_user_profile` - Get user profile
- `xhs_list_feeds` - Get homepage feeds

### Publishing
- `xhs_publish_content` - Publish image/text note
- `xhs_publish_video` - Publish video note

### Interactions
- `xhs_like_feed` - Like/unlike a note
- `xhs_favorite_feed` - Favorite/unfavorite a note
- `xhs_post_comment` - Post a comment
- `xhs_reply_comment` - Reply to a comment

### Downloads
- `xhs_download_images` - Download note images
- `xhs_download_video` - Download note video

### Statistics
- `xhs_get_account_stats` - Get account statistics
- `xhs_get_operation_logs` - Query operation history

## Common Parameters

### Account Selection

Most tools support these parameters for account selection:

| Parameter | Type | Description |
|-----------|------|-------------|
| `account` | string | Single account name or ID |
| `accounts` | string[] \| "all" | Multiple accounts |

If no account is specified and only one account exists, it's used automatically.

### Security Token

Content-related tools require `xsecToken` from search results:

| Parameter | Type | Description |
|-----------|------|-------------|
| `noteId` | string | Note ID |
| `xsecToken` | string | Security token from search |

## Response Format

All tools return responses in this format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{ ... JSON response ... }"
    }
  ]
}
```

Error responses include `isError: true`:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message"
    }
  ],
  "isError": true
}
```
