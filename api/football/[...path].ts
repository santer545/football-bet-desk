import type { IncomingMessage, ServerResponse } from 'http';

const API_BASE = 'https://api.football-data.org/v4';

function setCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Auth-Token, X-Response-Control, Content-Type');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET,OPTIONS');
    res.end();
    return;
  }

  const token = req.headers['x-auth-token'];
  if (!token) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Missing X-Auth-Token' }));
    return;
  }

  const query = (req as IncomingMessage & { query?: Record<string, string | string[]> }).query;
  const pathParam = query?.path;
  const pathParts = Array.isArray(pathParam) ? pathParam : typeof pathParam === 'string' ? [pathParam] : [];
  const targetPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '/';

  const url = new URL(`${API_BASE}${targetPath}`);
  const search = (req.url?.split('?')[1] ?? '');
  if (search) {
    url.search = search;
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Auth-Token': Array.isArray(token) ? token.join('') : (token as string),
        'Accept': 'application/json',
      },
    });

    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
    const text = await response.text();
    res.end(text);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        message: 'Proxy request failed',
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
  }
}
