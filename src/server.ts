/**
 * @fileoverview MCP server configuration and tool registration.
 * Creates the MCP server instance and routes tool calls to handlers.
 * @module server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from './core/account-pool.js';
import { XhsDatabase } from './db/index.js';
import { accountTools, handleAccountTools } from './tools/account.js';
import { authTools, handleAuthTools } from './tools/auth.js';
import { contentTools, handleContentTools } from './tools/content.js';
import { publishTools, handlePublishTools } from './tools/publish.js';
import { interactionTools, handleInteractionTools } from './tools/interaction.js';
import { statsTools, handleStatsTools } from './tools/stats.js';
import { downloadTools, handleDownloadTools } from './tools/download.js';
import { draftTools, handleDraftTools } from './tools/draft.js';
import { creatorTools, handleCreatorTools } from './tools/creator.js';
import { notificationTools, handleNotificationTools } from './tools/notification.js';
import { exploreTools, handleExploreTools } from './tools/explore.js';

/**
 * Create and configure the MCP server.
 * Registers all available tools and sets up request handlers.
 *
 * @param pool - Account pool for managing XhsClient instances
 * @param db - Database instance for persistence
 * @returns Configured MCP Server instance
 */
export function createMcpServer(pool: AccountPool, db: XhsDatabase): Server {
  const server = new Server(
    {
      name: 'xhs-mcp',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Collect all tools from all modules
  const allTools = [
    ...accountTools,
    ...authTools,
    ...contentTools,
    ...publishTools,
    ...interactionTools,
    ...statsTools,
    ...downloadTools,
    ...draftTools,
    ...creatorTools,
    ...notificationTools,
    ...exploreTools,
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
      if (accountTools.some((t) => t.name === name)) {
        return await handleAccountTools(name, args, pool, db);
      }

      if (authTools.some((t) => t.name === name)) {
        return await handleAuthTools(name, args, pool, db);
      }

      if (contentTools.some((t) => t.name === name)) {
        return await handleContentTools(name, args, pool, db);
      }

      if (publishTools.some((t) => t.name === name)) {
        return await handlePublishTools(name, args, pool, db);
      }

      if (interactionTools.some((t) => t.name === name)) {
        return await handleInteractionTools(name, args, pool, db);
      }

      if (statsTools.some((t) => t.name === name)) {
        return await handleStatsTools(name, args, pool, db);
      }

      if (downloadTools.some((t) => t.name === name)) {
        return await handleDownloadTools(name, args, pool, db);
      }

      if (draftTools.some((t) => t.name === name)) {
        return await handleDraftTools(name, args, pool, db);
      }

      if (creatorTools.some((t) => t.name === name)) {
        return await handleCreatorTools(name, args, pool, db);
      }

      if (notificationTools.some((t) => t.name === name)) {
        return await handleNotificationTools(name, args, pool, db);
      }

      if (exploreTools.some((t) => t.name === name)) {
        return await handleExploreTools(name, args, pool, db);
      }

      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${error.message}`);
      }
      throw error;
    }
  });

  return server;
}
