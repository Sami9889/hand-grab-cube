#!/usr/bin/env node
const path = require('node:path');
const { ensureApiInstall } = require('../src/api-system');

async function main() {
  const args = process.argv.slice(2);
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--host') {
      options.host = args[index + 1];
    } else if (arg === '--port') {
      options.port = Number(args[index + 1]);
    } else if (arg === '--prefix') {
      options.apiPrefix = args[index + 1];
    } else if (arg === '--name') {
      options.name = args[index + 1];
    } else if (arg === '--config') {
      options.configPath = path.resolve(args[index + 1]);
    } else if (arg === '--client-name') {
      options.clientName = args[index + 1];
    } else if (arg === '--client-password') {
      options.clientPassword = args[index + 1];
    } else if (arg === '--api-key') {
      options.apiKey = args[index + 1];
    } else if (arg === '--api-key-url') {
      options.apiKeyUrl = args[index + 1];
    } else if (arg === '--secret-file') {
      options.secretFile = path.resolve(args[index + 1]);
    } else if (arg === '--auth-required') {
      options.authRequired = args[index + 1] !== 'false';
    }
  }

  const result = await ensureApiInstall(options);
  console.log('API system installed successfully.');
  console.log(`Config: ${result.configPath}`);
  console.log(`Secrets: ${result.secretFilePath}`);
  console.log('Client credentials:');
  console.log(JSON.stringify({
    name: result.client.name,
    apiKey: result.client.apiKey,
    passwordHash: result.client.passwordHash
  }, null, 2));
  console.log('Use the generated apiKey in the x-api-key header for protected requests.');
}

main().catch((error) => {
  console.error('Installer failed:', error.message);
  process.exit(1);
});
