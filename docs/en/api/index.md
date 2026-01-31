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
- `xhs_add_account` - Start login flow (returns QR code)
- `xhs_check_login_session` - Check login status (call after QR scan)
- `xhs_check_auth_status` - Check if account is logged in (syncs profile)
- `xhs_submit_verification` - Submit SMS verification code
- `xhs_remove_account` - Remove an account
- `xhs_set_account_config` - Update account name, proxy, or status
- `xhs_get_account_prompt` - Get account prompt (persona/select/comment)
- `xhs_set_account_prompt` - Update account prompt

### Authentication
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
- `xhs_like_comment` - Like/unlike a comment

### Downloads
- `xhs_download_images` - Download note images
- `xhs_download_video` - Download note video

### AI Creation & Drafts
- `xhs_generate_image` - Generate image using Gemini AI
- `xhs_create_draft` - Create a note draft
- `xhs_list_drafts` - List all drafts
- `xhs_get_draft` - Get draft details
- `xhs_update_draft` - Update a draft
- `xhs_delete_draft` - Delete a draft
- `xhs_publish_draft` - Publish a draft

### Creator Center
- `xhs_get_my_notes` - Fetch published notes from creator center and cache to database
- `xhs_query_my_notes` - Query cached notes with multi-field filtering

### Notifications
- `xhs_get_notifications` - Get notifications (mentions, likes, connections)

### Explore
- `xhs_explore` - Automated browsing with AI note selection, probability-based liking/commenting

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
