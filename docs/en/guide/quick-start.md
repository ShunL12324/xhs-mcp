# Quick Start

This guide will help you get up and running with XHS-MCP in just a few minutes.

## Step 1: Add an Account

First, add a Xiaohongshu account:

```
xhs_add_account({ name: "my-account" })
```

This will:
1. Launch a headless browser
2. Capture the QR code from the login page
3. Open the QR code image in your default viewer
4. Wait for you to scan with the Xiaohongshu app
5. Save the session to the database

::: tip Remote Login
The QR code is also uploaded to a temporary image hosting service, allowing you to scan it from any device (including mobile).
:::

## Step 2: Verify Login

Check that you're logged in:

```
xhs_check_auth_status({ account: "my-account" })
```

## Step 3: Search for Content

Search for notes on Xiaohongshu:

```
xhs_search({ keyword: "美食", count: 10 })
```

Response includes:
- Note ID and xsecToken (needed for fetching details)
- Title and cover image
- Author info
- Like count

## Step 4: Get Note Details

Fetch full details for a note:

```
xhs_get_note({
  noteId: "abc123",
  xsecToken: "token-from-search"
})
```

Returns:
- Full content and images
- Video URL (for video notes)
- Comments
- Engagement stats

## Step 5: Interact with Content

Like a note:

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token-from-search"
})
```

Post a comment:

```
xhs_post_comment({
  noteId: "abc123",
  xsecToken: "token-from-search",
  content: "Great post!"
})
```

## Multi-Account Operations

Run operations across multiple accounts:

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: ["account1", "account2"]
})
```

Or use all active accounts:

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: "all"
})
```

## What's Next?

- [Multi-Account Guide](/guide/multi-account) - Advanced account management
- [Publishing Guide](/guide/publishing) - Post content to Xiaohongshu
- [API Reference](/api/) - Complete tool documentation
