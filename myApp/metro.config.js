const { getDefaultConfig } = require('expo/metro-config');
const dns = require('dns');
const https = require('https');
const { URL } = require('url');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const DSTU_BASE = 'https://dstu.devoriole.ru';

/** Не проксируем hop-by-hop и host (подставим целевой). */
function forwardHeaders(raw) {
  const out = { ...raw };
  const drop = new Set([
    'connection',
    'keep-alive',
    'proxy-connection',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'host',
  ]);
  for (const key of Object.keys(out)) {
    if (drop.has(key.toLowerCase())) {
      delete out[key];
    }
  }
  return out;
}

/** Прокси /api/dstu/* → dstu (без http-proxy / util._extend — см. DEP0060 в Node). */
function dstuApiProxy(req, res, next) {
  if (!req.url?.startsWith('/api/dstu')) {
    return next();
  }

  const pathOnDstu = req.url.replace(/^\/api\/dstu/, '') || '/';
  const target = new URL(pathOnDstu.startsWith('/') ? pathOnDstu : `/${pathOnDstu}`, `${DSTU_BASE}/`);

  const headers = forwardHeaders(req.headers);
  headers.host = target.host;

  const opts = {
    hostname: target.hostname,
    port: target.port || 443,
    path: target.pathname + target.search,
    method: req.method,
    headers,
    // Fallback DNS: при временном EAI_AGAIN пробуем резолв через resolve4.
    lookup(hostname, options, callback) {
      dns.lookup(hostname, options, (err, address, family) => {
        if (!err) {
          callback(null, address, family);
          return;
        }
        dns.resolve4(hostname, (rErr, addresses) => {
          if (!rErr && Array.isArray(addresses) && addresses.length > 0) {
            callback(null, addresses[0], 4);
            return;
          }
          callback(err);
        });
      });
    },
  };

  const pReq = https.request(opts, (pRes) => {
    const out = { ...pRes.headers };
    for (const name of Object.keys(out)) {
      if (name.toLowerCase().startsWith('access-control-')) {
        delete out[name];
      }
    }
    res.writeHead(pRes.statusCode ?? 502, out);
    pRes.pipe(res);
  });

  pReq.on('error', (err) => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Proxy: ${err.message}`);
    }
  });

  req.pipe(pReq);
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      return dstuApiProxy(req, res, () => middleware(req, res, next));
    };
  },
};

module.exports = config;
