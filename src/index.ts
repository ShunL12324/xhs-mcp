import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { XhsClient } from './xhs/index.js';
import { authTools, handleAuthTools } from './tools/auth.js';
import { contentTools, handleContentTools } from './tools/content.js';

const client = new XhsClient();

const server = new Server(
  {
    name: 'xhs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...authTools,
      ...contentTools,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (authTools.some(t => t.name === name)) {
      return await handleAuthTools(name, args, client);
    }

    if (contentTools.some(t => t.name === name)) {
      return await handleContentTools(name, args, client);
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${name}`
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments: ${error.message}`
      );
    }
    throw error;
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Xiaohongshu MCP Server running on stdio');
}

// Graceful shutdown
async function shutdown() {
  console.error('Shutting down...');
  await client.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((error) => {
  console.error('Server error:', error);
  client.close().finally(() => process.exit(1));
});
