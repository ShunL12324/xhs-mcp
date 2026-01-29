# API 概览

小红书 MCP 服务器提供以下工具：

## 账号管理

| 工具 | 说明 |
|------|------|
| [xhs_list_accounts](/api/xhs_list_accounts) | 列出所有账号 |
| [xhs_add_account](/api/xhs_add_account) | 开始登录流程（返回二维码） |
| [xhs_check_login](/api/xhs_check_login) | 检查登录状态（扫码后调用） |
| [xhs_submit_verification](/api/xhs_submit_verification) | 提交短信验证码 |
| [xhs_remove_account](/api/xhs_remove_account) | 删除账号 |
| [xhs_set_account_config](/api/xhs_set_account_config) | 修改账号配置 |
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
