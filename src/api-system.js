const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');

function getDefaultConfig() {
  return {
    host: '127.0.0.1',
    port: 3001,
    apiPrefix: '/api',
    name: 'hand-grab-cube-api',
    authRequired: true,
    secretFile: path.resolve(process.cwd(), '.api', 'secrets.json')
  };
}

function loadPackageJson(packageJsonPath) {
  const resolvedPath = packageJsonPath ? path.resolve(packageJsonPath) : path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(resolvedPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    return {};
  }
}

function loadConfig(configPath = path.resolve(process.cwd(), '.api', 'config.json')) {
  const resolvedPath = path.resolve(configPath);
  const defaults = getDefaultConfig();
  let savedConfig = {};

  if (fs.existsSync(resolvedPath)) {
    try {
      savedConfig = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } catch (error) {
      savedConfig = {};
    }
  }

  const merged = {
    ...defaults,
    ...savedConfig,
    host: process.env.API_HOST || savedConfig.host || defaults.host,
    port: Number(process.env.API_PORT || savedConfig.port || defaults.port),
    apiPrefix: process.env.API_PREFIX || savedConfig.apiPrefix || defaults.apiPrefix,
    name: process.env.API_NAME || savedConfig.name || defaults.name,
    authRequired: process.env.API_AUTH_REQUIRED !== undefined ? process.env.API_AUTH_REQUIRED === 'true' : (savedConfig.authRequired ?? defaults.authRequired),
    secretFile: process.env.API_SECRET_FILE || savedConfig.secretFile || defaults.secretFile
  };

  return {
    ...merged,
    configPath: resolvedPath
  };
}

function loadSecrets(secretFilePath = path.resolve(process.cwd(), '.api', 'secrets.json')) {
  const resolvedPath = path.resolve(secretFilePath);
  if (!fs.existsSync(resolvedPath)) {
    return { clients: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    return { clients: [] };
  }
}

function hashSecret(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function findClientByApiKey(secrets, apiKey) {
  if (!secrets || !Array.isArray(secrets.clients)) {
    return null;
  }

  return secrets.clients.find((client) => client.enabled !== false && client.apiKey && hashSecret(client.apiKey) === hashSecret(apiKey));
}

async function resolveApiKeyFromUrl(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Unable to fetch API key from ${url}: ${response.status}`);
  }

  const payload = await response.json();
  return payload.apiKey || payload.key || payload.token || null;
}

function createApiHandler({ packageJson = {}, config = {}, secrets = {} } = {}) {
  const resolvedConfig = {
    ...getDefaultConfig(),
    ...config
  };

  const serviceName = packageJson.name || resolvedConfig.name || 'hand-grab-cube-api';
  const serviceVersion = packageJson.version || '0.0.0';
  const basePath = resolvedConfig.apiPrefix || '/api';
  const authRequired = resolvedConfig.authRequired !== false;
  const loadedSecrets = secrets && Object.keys(secrets).length ? secrets : loadSecrets(resolvedConfig.secretFile);

  return async function apiHandler(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = requestUrl.pathname;
    const apiKey = req.headers['x-api-key'] || req.headers['x-api-key'];

    if (req.method === 'GET' && (pathname === '/health' || pathname === `${basePath}/health`)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: serviceName, version: serviceVersion, uptime: process.uptime().toFixed(2) }));
      return;
    }

    if (req.method === 'GET' && (pathname === '/info' || pathname === `${basePath}/info`)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: serviceName, version: serviceVersion, apiPrefix: basePath, host: resolvedConfig.host, port: resolvedConfig.port, authRequired }));
      return;
    }

    if (req.method === 'GET' && (pathname === '/' || pathname === basePath)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: `${serviceName} API is ready`, apiPrefix: basePath }));
      return;
    }

    if (pathname === `${basePath}/secure` || pathname === '/secure') {
      if (authRequired && !apiKey) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Missing API key' }));
        return;
      }

      const client = authRequired ? findClientByApiKey(loadedSecrets, apiKey) : null;
      if (authRequired && !client) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid API key' }));
        return;
      }

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Secure endpoint reached', client: client ? client.name : 'anonymous' }));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
  };
}

async function ensureApiInstall(options = {}) {
  const packageJson = options.packageJson || loadPackageJson(options.packageJsonPath);
  const configPath = path.resolve(options.configPath || path.resolve(process.cwd(), '.api', 'config.json'));
  const configDir = path.dirname(configPath);
  const secretFilePath = path.resolve(options.secretFile || path.resolve(process.cwd(), '.api', 'secrets.json'));

  fs.mkdirSync(configDir, { recursive: true });

  const fileConfig = {
    ...getDefaultConfig(),
    ...loadConfig(configPath),
    ...options
  };

  const installConfig = {
    host: fileConfig.host || getDefaultConfig().host,
    port: Number(fileConfig.port || getDefaultConfig().port),
    apiPrefix: fileConfig.apiPrefix || getDefaultConfig().apiPrefix,
    name: fileConfig.name || packageJson.name || getDefaultConfig().name,
    authRequired: fileConfig.authRequired !== false,
    secretFile: secretFilePath
  };

  fs.writeFileSync(configPath, JSON.stringify(installConfig, null, 2));

  const existingSecrets = loadSecrets(secretFilePath);
  let resolvedApiKey = options.apiKey;

  if (!resolvedApiKey && options.apiKeyUrl) {
    resolvedApiKey = await resolveApiKeyFromUrl(options.apiKeyUrl);
  }

  if (!resolvedApiKey) {
    resolvedApiKey = crypto.randomBytes(24).toString('hex');
  }

  const defaultClient = {
    name: options.clientName || 'default-client',
    passwordHash: hashSecret(options.clientPassword || 'change-me'),
    apiKey: resolvedApiKey,
    enabled: true
  };

  const secretPayload = {
    ...existingSecrets,
    clients: existingSecrets.clients && existingSecrets.clients.length ? existingSecrets.clients : [defaultClient]
  };

  fs.writeFileSync(secretFilePath, JSON.stringify(secretPayload, null, 2));

  return {
    configPath,
    secretFilePath,
    config: installConfig,
    client: secretPayload.clients[0]
  };
}

async function startApiServer(options = {}) {
  const packageJson = options.packageJson || loadPackageJson(options.packageJsonPath);
  const config = loadConfig(options.configPath || path.resolve(process.cwd(), '.api', 'config.json'));
  const secrets = options.secrets || loadSecrets(config.secretFile);
  const server = http.createServer(createApiHandler({ packageJson, config, secrets }));

  await new Promise((resolve) => {
    server.listen(config.port, config.host, resolve);
  });

  return {
    server,
    config
  };
}

module.exports = {
  createApiHandler,
  ensureApiInstall,
  loadConfig,
  loadPackageJson,
  startApiServer,
  getDefaultConfig,
  resolveApiKeyFromUrl
};
