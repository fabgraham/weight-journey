const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });

// Local preview only: forwards /api-proxy/* to the real API from the dev server,
// so the browser never makes a cross-origin request and the API's CORS setting doesn't apply.
const API_PROXY_PREFIX = "/api-proxy";
const apiProxyTarget = process.env.API_PROXY_TARGET;

async function proxyToApi(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && chunks.length > 0;

  const upstream = await fetch(apiProxyTarget + req.url.slice(API_PROXY_PREFIX.length), {
    method: req.method,
    headers: {
      "content-type": req.headers["content-type"] ?? "application/json",
      "x-api-key": req.headers["x-api-key"] ?? "",
    },
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });

  res.statusCode = upstream.status;
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.setHeader("content-type", contentType);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

if (apiProxyTarget) {
  const previousEnhance = config.server?.enhanceMiddleware;
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware, server) => {
      const base = previousEnhance ? previousEnhance(middleware, server) : middleware;
      return (req, res, next) => {
        if (!req.url.startsWith(`${API_PROXY_PREFIX}/`)) return base(req, res, next);
        proxyToApi(req, res).catch((error) => {
          res.statusCode = 502;
          res.end(`API proxy error: ${error.message}`);
        });
      };
    },
  };
}

module.exports = config;
