/**
 * @fileoverview HTTP transport server for the MCP protocol.
 * Provides a Hono-based HTTP server as an alternative to stdio transport.
 * Uses StreamableHTTPServerTransport for MCP communication.
 * @module http-server
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMcpServer } from './server.js';
import { initDatabase } from './db/index.js';
import { getAccountPool } from './core/account-pool.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { config } from './core/config.js';

/**
 * Start the HTTP transport server for the MCP protocol.
 * Uses Hono as the HTTP framework and Bun as the runtime.
 *
 * @param port - Port number to listen on (default: 18060)
 */
export async function startHttpServer(port: number = config.server.port) {
  // Initialize database and account pool
  const db = await initDatabase();
  const pool = getAccountPool(db);

  /**
   * Create a new MCP server and transport for each request.
   * In stateless HTTP mode, each request is independent.
   */
  const getOrCreateServer = async (): Promise<{ server: Server; transport: StreamableHTTPServerTransport }> => {
    // For stateless mode, we need a fresh transport per request
    // but can potentially reuse the server logic
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    // Create server if not exists, or create new one for each request in stateless mode
    // Note: In stateless HTTP mode, each request is independent
    const server = createMcpServer(pool, db);
    await server.connect(transport);

    return { server, transport };
  };

  const app = new Hono();

  // Enable CORS for all origins
  app.use('*', cors({
    origin: '*',
    exposeHeaders: ['Mcp-Session-Id'],
  }));

  // MCP endpoint using StreamableHTTPServerTransport
  app.post('/mcp', async (c) => {
    let server: Server | null = null;
    let transport: StreamableHTTPServerTransport | null = null;

    try {
      const result = await getOrCreateServer();
      server = result.server;
      transport = result.transport;

      // Get the raw request body
      const body = await c.req.json();

      // Create a mock Express-like request/response for the transport
      // StreamableHTTPServerTransport expects Express-style req/res
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const mockReq = {
        headers,
        body,
      };

      let responseBody: any = null;
      let responseHeaders: Record<string, string> = {};
      let responseStatus = 200;

      const mockRes = {
        writeHead: (status: number, headers?: Record<string, string>) => {
          responseStatus = status;
          if (headers) {
            responseHeaders = { ...responseHeaders, ...headers };
          }
          return mockRes;
        },
        setHeader: (name: string, value: string) => {
          responseHeaders[name] = value;
          return mockRes;
        },
        getHeader: (name: string) => responseHeaders[name],
        write: (chunk: string | Buffer) => {
          if (responseBody === null) {
            responseBody = '';
          }
          responseBody += typeof chunk === 'string' ? chunk : chunk.toString();
          return true;
        },
        end: (data?: string | Buffer) => {
          if (data) {
            if (responseBody === null) {
              responseBody = '';
            }
            responseBody += typeof data === 'string' ? data : data.toString();
          }
          return mockRes;
        },
        on: () => mockRes,
        headersSent: false,
        flushHeaders: () => {},
      };

      await transport.handleRequest(mockReq as any, mockRes as any, body);

      // Build response
      const response = new Response(responseBody, {
        status: responseStatus,
        headers: responseHeaders,
      });

      return response;
    } catch (error) {
      console.error('Error handling MCP request:', error);
      return c.json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      }, 500);
    } finally {
      // Clean up transport and server
      if (transport) {
        await transport.close().catch(() => {});
      }
      if (server) {
        await server.close().catch(() => {});
      }
    }
  });

  // Method not allowed for GET/DELETE
  app.get('/mcp', (c) => {
    return c.json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    }, 405);
  });

  app.delete('/mcp', (c) => {
    return c.json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    }, 405);
  });

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({ status: 'ok', server: 'xhs-mcp', version: '2.0.0' });
  });

  // Info endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'xhs-mcp',
      version: '2.0.0',
      description: 'Xiaohongshu MCP Server with Multi-Account Support',
      endpoints: {
        mcp: '/mcp',
        health: '/health',
      },
    });
  });

  console.error(`Starting HTTP server on port ${port}...`);
  console.error(`MCP endpoint: http://localhost:${port}/mcp`);

  // Graceful shutdown
  const shutdown = async () => {
    console.error('Shutting down HTTP server...');
    await pool.closeAll();
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start Bun server
  Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.error(`HTTP server running on http://localhost:${port}`);
}
