#!/usr/bin/env node
const { startApiServer, loadPackageJson } = require('../src/api-system');

async function main() {
  const packageJson = loadPackageJson();
  const { server, config } = await startApiServer({ packageJson });
  console.log(`API server listening on http://${config.host}:${config.port}${config.apiPrefix}`);

  const shutdown = () => {
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start API server', error);
  process.exit(1);
});
