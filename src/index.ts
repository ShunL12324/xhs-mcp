#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { XhsClient } from './xhs/index.js';
import { startHttpServer } from './http-server.js';

// Parse command line arguments
function parseArgs(): { http: boolean; port: number } {
  const args = process.argv.slice(2);
  let http = false;
  let port = 18060;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--http' || arg === '-h') {
      http = true;
    } else if (arg === '--port' || arg === '-p') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        port = parseInt(nextArg, 10);
        i++;
      }
    } else if (arg.startsWith('--port=')) {
      port = parseInt(arg.split('=')[1], 10);
    }
  }

  return { http, port };
}

async function runStdioMode() {
  const client = new XhsClient();
  const server = createMcpServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('Xiaohongshu MCP Server running on stdio');

  // Graceful shutdown
  const shutdown = async () => {
    console.error('Shutting down...');
    await client.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main() {
  const { http, port } = parseArgs();

  if (http) {
    await startHttpServer(port);
  } else {
    await runStdioMode();
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
