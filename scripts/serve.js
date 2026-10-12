import { createServer as createHttpServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot, routePaths } from './build.js';

const routes = new Set(routePaths);
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};
const assetTypes = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico', '.woff2']);

function requestPath(target) {
  if (!target?.startsWith('/') || target.startsWith('//')) return null;
  let path;
  try { path = decodeURIComponent(target.split('?')[0]); } catch { return null; }
  if (/[\\\u0000-\u001f\u007f%]/.test(path) || path.includes('//')) return null;
  if (path.split('/').some(part => part.startsWith('.'))) return null;
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

async function safeRead(file, base) {
  const [actualFile, actualBase] = await Promise.all([realpath(file), realpath(base)]);
  const path = relative(actualBase, actualFile);
  if (path === '..' || path.startsWith(`..${sep}`) || path.startsWith(sep)) throw new Error('Outside served directory');
  if (!(await stat(actualFile)).isFile()) throw new Error('Not a file');
  return readFile(actualFile);
}

export function createRequestHandler({ root = projectRoot, dist = false } = {}) {
  const base = dist ? join(root, 'dist') : root;
  return async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': contentTypes['.txt'] });
      response.end('Method not allowed');
      return;
    }
    const path = requestPath(request.url);
    let file;
    let allowedBase = base;
    if (path && routes.has(path)) {
      file = dist ? join(base, path.slice(1), 'index.html') : join(base, 'index.html');
    } else if (path && /^\/src\/[a-zA-Z0-9_/-]+\.(js|css)$/.test(path)) {
      allowedBase = join(base, 'src');
      file = join(base, path.slice(1));
    } else if (path?.startsWith('/assets/') && assetTypes.has(extname(path).toLowerCase())) {
      allowedBase = dist ? join(base, 'assets') : join(base, 'public', 'assets');
      file = join(allowedBase, path.slice('/assets/'.length));
    } else if (dist && ['/robots.txt', '/sitemap.xml', '/404.html'].includes(path)) {
      file = join(base, path.slice(1));
    }
    if (file) {
      try {
        let content;
        try {
          content = await safeRead(file, allowedBase);
        } catch (error) {
          if (!dist || !routes.has(path) || error.code !== 'ENOENT') throw error;
          file = join(base, 'index.html');
          content = await safeRead(file, base);
        }
        response.writeHead(200, { 'Content-Type': contentTypes[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': content.length });
        response.end(request.method === 'HEAD' ? undefined : content);
        return;
      } catch { /* Missing or disallowed files are handled uniformly below. */ }
    }
    response.writeHead(404, { 'Content-Type': contentTypes['.txt'] });
    response.end(request.method === 'HEAD' ? undefined : 'Not found');
  };
}

export function createServer(options) {
  return createHttpServer(createRequestHandler(options));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 5173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer from 1 to 65535.');
    process.exitCode = 1;
  } else {
    const server = createServer({ dist: process.argv.includes('--dist') });
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '0.0.0.0', () => console.log(`CanMyDeviceRunIt: http://localhost:${port}${process.argv.includes('--dist') ? ' (production preview)' : ''}`));
  }
}
