import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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
import { publishTools, handlePublishTools } from './tools/publish.js';
import { interactionTools, handleInteractionTools } from './tools/interaction.js';

export function createMcpServer(client: XhsClient): Server {
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

  // Collect all tools
  const allTools = [
    ...authTools,
    ...contentTools,
    ...publishTools,
    ...interactionTools,
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      // Route to appropriate handler
      if (authTools.some(t => t.name === name)) {
        return await handleAuthTools(name, args, client);
      }

      if (contentTools.some(t => t.name === name)) {
        return await handleContentTools(name, args, client);
      }

      if (publishTools.some(t => t.name === name)) {
        return await handlePublishTools(name, args, client);
      }

      if (interactionTools.some(t => t.name === name)) {
        return await handleInteractionTools(name, args, client);
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

  return server;
}
