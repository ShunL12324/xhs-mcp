# xhs_set_account_config

Update account configuration.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |
| `name` | string | No | New name |
| `proxy` | string | No | Proxy address (empty string to clear) |
| `status` | string | No | Status: active / suspended / banned |

## Response

```json
{
  "success": true
}
```

## Example

### Rename

```
xhs_set_account_config({
  account: "old-name",
  name: "new-name"
})
```

### Set proxy

```
xhs_set_account_config({
  account: "main",
  proxy: "http://127.0.0.1:7890"
})
```

### Clear proxy

```
xhs_set_account_config({
  account: "main",
  proxy: ""
})
```

### Suspend account

```
xhs_set_account_config({
  account: "backup",
  status: "suspended"
})
```

## Account Status

| Status | Description |
|--------|-------------|
| `active` | Normal, can be used |
| `suspended` | Paused, excluded from "all" batch operations |
| `banned` | Banned |
