/**
 * Cloudflare Pages Function — API proxy
 *
 * Routes /api/* requests to the Workers backend server-to-server.
 * This keeps cookies same-site (pages.dev → pages.dev) and avoids
 * third-party cookie blocking that would occur with direct cross-origin
 * requests from the browser (pages.dev → workers.dev).
 */
/* global URL, Request, fetch */

const BACKEND_URL = "https://stockflow-api.hola-1c9.workers.dev";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Rewrite the origin to the backend; keep path, query string, etc.
  url.hostname = new URL(BACKEND_URL).hostname;
  url.protocol = "https:";
  url.port = "";

  const request = new Request(url.toString(), context.request);

  return fetch(request);
}
