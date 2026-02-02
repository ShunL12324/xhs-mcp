# API 概览

小红书 MCP 服务器提供以下工具：

## 账号管理

| 工具 | 说明 |
|------|------|
| [xhs_list_accounts](/api/xhs_list_accounts) | 列出所有账号 |
| [xhs_add_account](/api/xhs_add_account) | 开始登录流程（返回二维码） |
| [xhs_check_login_session](/api/xhs_check_login_session) | 检查登录状态（扫码后调用） |
| [xhs_check_auth_status](/api/xhs_check_auth_status) | 检查账号是否已登录（同步用户资料） |
| [xhs_submit_verification](/api/xhs_submit_verification) | 提交短信验证码 |
| [xhs_remove_account](/api/xhs_remove_account) | 删除账号 |
| [xhs_set_account_config](/api/xhs_set_account_config) | 修改账号配置 |
| [xhs_get_account_prompt](/api/xhs_get_account_prompt) | 获取账号 Prompt（人设/选择/评论） |
| [xhs_set_account_prompt](/api/xhs_set_account_prompt) | 更新账号 Prompt |
| [xhs_delete_cookies](/api/xhs_delete_cookies) | 删除会话 |

## 内容查询

| 工具 | 说明 |
|------|------|
| [xhs_search](/api/xhs_search) | 搜索笔记 |
| [xhs_get_note](/api/xhs_get_note) | 获取笔记详情 |
| [xhs_user_profile](/api/xhs_user_profile) | 获取用户资料 |
| [xhs_list_feeds](/api/xhs_list_feeds) | 获取首页推荐 |

## 内容发布

| 工具 | 说明 |
|------|------|
| [xhs_publish_content](/api/xhs_publish_content) | 发布图文笔记 |
| [xhs_publish_video](/api/xhs_publish_video) | 发布视频笔记 |

## 互动功能

| 工具 | 说明 |
|------|------|
| [xhs_like_feed](/api/xhs_like_feed) | 点赞/取消点赞 |
| [xhs_favorite_feed](/api/xhs_favorite_feed) | 收藏/取消收藏 |
| [xhs_post_comment](/api/xhs_post_comment) | 发表评论 |
| [xhs_reply_comment](/api/xhs_reply_comment) | 回复评论 |
| [xhs_like_comment](/api/xhs_like_comment) | 点赞/取消点赞评论 |

## 数据统计

| 工具 | 说明 |
|------|------|
| [xhs_get_account_stats](/api/xhs_get_account_stats) | 获取账号统计 |
| [xhs_get_operation_logs](/api/xhs_get_operation_logs) | 查询操作日志 |

## 下载

| 工具 | 说明 |
|------|------|
| [xhs_download_images](/api/xhs_download_images) | 下载笔记图片 |
| [xhs_download_video](/api/xhs_download_video) | 下载笔记视频 |

## AI 创作与草稿

| 工具 | 说明 |
|------|------|
| [xhs_create_draft](/api/xhs_create_draft) | 创建笔记草稿（AI 自动处理截图生成配图） |
| [xhs_list_drafts](/api/xhs_list_drafts) | 列出所有草稿 |
| [xhs_get_draft](/api/xhs_get_draft) | 获取草稿详情 |
| [xhs_update_draft](/api/xhs_update_draft) | 更新草稿 |
| [xhs_delete_draft](/api/xhs_delete_draft) | 删除草稿 |
| [xhs_publish_draft](/api/xhs_publish_draft) | 发布草稿 |

## 创作者中心

| 工具 | 说明 |
|------|------|
| [xhs_get_my_notes](/api/xhs_get_my_notes) | 获取已发布笔记列表（从创作者中心获取并缓存） |
| [xhs_query_my_notes](/api/xhs_query_my_notes) | 查询已缓存的笔记（支持多条件过滤） |

## 通知

| 工具 | 说明 |
|------|------|
| [xhs_get_notifications](/api/xhs_get_notifications) | 获取通知（提及、点赞、关注） |

## 自动浏览

| 工具 | 说明 |
|------|------|
| [xhs_explore](/api/xhs_explore) | 自动浏览探索页（AI 选择笔记、概率点赞评论） |
| [xhs_stop_explore](/api/xhs_stop_explore) | 停止正在运行的 explore 会话 |
