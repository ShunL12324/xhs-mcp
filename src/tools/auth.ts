import { XhsClient } from '../xhs/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const authTools: Tool[] = [
  {
    name: 'xhs_check_login',
    description: 'Check if currently logged in to Xiaohongshu. Returns login status and verification method.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'xhs_login',
    description: 'Login to Xiaohongshu by scanning a QR code. This will open a visible browser window. Use xhs_check_login first to see if already logged in.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleAuthTools(name: string, args: any, client: XhsClient) {
  switch (name) {
    case 'xhs_check_login': {
      const status = await client.checkLoginStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              loggedIn: status.loggedIn,
              message: status.message,
              hint: status.loggedIn
                ? 'You can now use other xhs tools.'
                : 'Please use xhs_login to login first.',
            }, null, 2),
          },
        ],
      };
    }

    case 'xhs_login': {
      // 直接启动登录流程，不预先检查（避免超时）
      await client.login();

      return {
        content: [
          {
            type: 'text',
            text: 'Login process completed. Session saved if successful.',
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown auth tool: ${name}`);
  }
}
