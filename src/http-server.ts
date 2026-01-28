import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMcpServer } from './server.js';
import { XhsClient } from './xhs/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const DEFAULT_PORT = 18060;

export async function startHttpServer(port: number = DEFAULT_PORT) {
  const app = new Hono();
  const client = new XhsClient();

  // Enable CORS for all origins
  app.use('*', cors({
    origin: '*',
    exposeHeaders: ['Mcp-Session-Id'],
  }));

  // MCP endpoint using StreamableHTTPServerTransport
  app.post('/mcp', async (c) => {
    const server = createMcpServer(client);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
      });

      await server.connect(transport);

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

      // Clean up
      await transport.close();
      await server.close();

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
    return c.json({ status: 'ok', server: 'xhs-mcp' });
  });

  // Info endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'xhs-mcp',
      version: '1.0.0',
      description: 'Xiaohongshu MCP Server',
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
    await client.close();
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
