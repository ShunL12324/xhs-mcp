# Multi-Account Management

XHS-MCP supports managing multiple Xiaohongshu accounts with features like account locking, session persistence, and operation logging.

## Account Lifecycle

### Adding Accounts

```
xhs_add_account({ name: "work-account" })
xhs_add_account({ name: "personal-account", proxy: "http://proxy:8080" })
```

Each account gets:
- Unique UUID identifier
- Persistent session storage
- Optional proxy configuration
- Operation history tracking

### Listing Accounts

```
xhs_list_accounts()
```

Returns:
```json
{
  "count": 2,
  "accounts": [
    {
      "id": "uuid-1",
      "name": "work-account",
      "status": "active",
      "hasSession": true,
      "stats": { "totalOperations": 42, "successRate": 98 }
    },
    {
      "id": "uuid-2",
      "name": "personal-account",
      "status": "active",
      "hasSession": true,
      "stats": { "totalOperations": 15, "successRate": 100 }
    }
  ]
}
```

### Updating Accounts

Rename an account:
```
xhs_set_account_config({ account: "old-name", name: "new-name" })
```

Change proxy:
```
xhs_set_account_config({ account: "my-account", proxy: "http://new-proxy:8080" })
```

Suspend an account:
```
xhs_set_account_config({ account: "my-account", status: "suspended" })
```

### Removing Accounts

```
xhs_remove_account({ account: "my-account" })
```

This deletes:
- Account record
- Stored session
- All operation logs for this account

## Account Selection

### Single Account

Specify account by name or ID:

```
xhs_search({ keyword: "美食", account: "work-account" })
```

### Default Account

If only one account exists and no account is specified, it's used automatically:

```
xhs_search({ keyword: "美食" })  // Uses the only account
```

### Multiple Accounts

Execute on specific accounts:

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: ["account1", "account2", "account3"]
})
```

Execute on all active accounts:

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: "all"
})
```

## Account Locking

XHS-MCP prevents concurrent operations on the same account to avoid browser state conflicts.

If you try to run two operations on the same account simultaneously:
- The second operation waits for the first to complete
- Default timeout is 30 seconds
- Prevents session corruption and rate limiting issues

## Session Persistence

Sessions are stored in SQLite and automatically restored:
- Cookies
- LocalStorage
- Browser state

Re-login is only needed when:
- Session expires (typically after extended inactivity)
- You explicitly delete cookies with `xhs_delete_cookies`

## Operation Logging

Every operation is logged with:
- Timestamp
- Account ID
- Action type
- Parameters
- Result
- Duration
- Success/failure status

Query logs with:

```
xhs_get_operation_logs({
  account: "my-account",
  action: "search",
  limit: 50
})
```

Get aggregated stats:

```
xhs_get_account_stats({ account: "my-account" })
```
