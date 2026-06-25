const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApiHandler, loadConfig, resolveApiKeyFromUrl } = require('../src/api-system');

test('health endpoint returns a healthy payload', async () => {
  const handler = createApiHandler({
    packageJson: { name: 'demo-api', version: '1.0.0' },
    config: { host: '127.0.0.1', port: 0 }
  });

  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.service, 'demo-api');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('loadConfig keeps defaults and merges the saved file values', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hand-grab-cube-api-'));
  const configPath = path.join(tempDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ port: 4100, name: 'custom-api' }));

  const config = loadConfig(configPath);

  assert.equal(config.port, 4100);
  assert.equal(config.name, 'custom-api');
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.apiPrefix, '/api');
});

test('protected routes reject missing keys and accept valid ones', async () => {
  const handler = createApiHandler({
    packageJson: { name: 'secure-api', version: '1.0.0' },
    config: { host: '127.0.0.1', port: 0, apiPrefix: '/api' },
    secrets: {
      clients: [{ name: 'alice', passwordHash: 'hash', apiKey: 'secret-key', enabled: true }]
    }
  });

  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    const missingResponse = await fetch(`http://127.0.0.1:${address.port}/api/secure`, { headers: { Accept: 'application/json' } });
    assert.equal(missingResponse.status, 401);

    const validResponse = await fetch(`http://127.0.0.1:${address.port}/api/secure`, { headers: { 'x-api-key': 'secret-key', Accept: 'application/json' } });
    const payload = await validResponse.json();

    assert.equal(validResponse.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.client, 'alice');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('resolveApiKeyFromUrl returns an API key from a JSON endpoint', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ apiKey: 'remote-key' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    const apiKey = await resolveApiKeyFromUrl(`http://127.0.0.1:${address.port}/api`);
    assert.equal(apiKey, 'remote-key');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('resolveApiKeyFromUrl returns null when the remote endpoint fails', async () => {
  const apiKey = await resolveApiKeyFromUrl('http://127.0.0.1:1/api');
  assert.equal(apiKey, null);
});
