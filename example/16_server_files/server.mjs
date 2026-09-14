import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const records = new Map([[1, { id: 1, name: 'Alice', attachment: null }]]);
const files = new Map();
let nextId = 2;
let nextFileId = 1;
const maxFileSize = 2 * 1024 * 1024;

function json(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function readForm(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxFileSize + 65536)
      throw new Error('Request exceeds the upload limit');
    chunks.push(chunk);
  }
  const body = new Request('http://127.0.0.1', {
    method: 'POST',
    headers: { 'Content-Type': request.headers['content-type'] || '' },
    body: Buffer.concat(chunks),
  });
  return body.formData();
}

createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1:8090').pathname;
    if (path === '/api/records' && request.method === 'GET') {
      json(response, 200, [...records.values()]);
      return;
    }
    const recordPath = path.match(/^\/api\/records\/(\d+)$/);
    if (
      (path === '/api/records' && request.method === 'POST') ||
      (recordPath && request.method === 'PATCH')
    ) {
      const form = await readForm(request);
      const file = form.get('attachment');
      if (file instanceof File && file.size > maxFileSize) {
        json(response, 413, { message: 'File exceeds 2 MiB' });
        return;
      }
      const contents =
        file instanceof File ? Buffer.from(await file.arrayBuffer()) : null;
      const id = recordPath ? Number(recordPath[1]) : nextId;
      const previous = records.get(id);
      if (recordPath && !previous) {
        json(response, 404, { message: 'Record not found' });
        return;
      }
      const name = String(form.get('name') || '').trim();
      if (!name || name.length > 100) {
        json(response, 422, {
          message: 'Name must contain 1 to 100 characters',
        });
        return;
      }
      if (
        [...records.values()].some(
          (row) =>
            row.id !== id && row.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        json(response, 409, {
          message:
            'This name is already in use. Choose another name and retry.',
        });
        return;
      }
      let attachment = previous?.attachment || null;
      if (file instanceof File) {
        const fileId = nextFileId++;
        files.set(fileId, contents);
        attachment = { id: fileId, name: file.name };
        if (previous?.attachment) files.delete(previous.attachment.id);
      }
      const row = { id, name, attachment };
      records.set(id, row);
      if (!recordPath) nextId++;
      json(response, recordPath ? 200 : 201, row);
      return;
    }
    if (recordPath && request.method === 'DELETE') {
      const id = Number(recordPath[1]);
      const row = records.get(id);
      if (!row) {
        json(response, 404, { message: 'Record not found' });
        return;
      }
      if (row.attachment) files.delete(row.attachment.id);
      records.delete(id);
      response.writeHead(204).end();
      return;
    }
    const filePath = path.match(/^\/api\/files\/(\d+)$/);
    if (filePath && request.method === 'GET') {
      const data = files.get(Number(filePath[1]));
      if (!data) {
        json(response, 404, { message: 'File not found' });
        return;
      }
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(data);
      return;
    }
    if (
      request.method !== 'GET' ||
      !/^\/(index\.html$|example\/|dist\/|translations\/|$)/.test(path)
    ) {
      json(response, 404, { message: 'Not found' });
      return;
    }
    const decodedPath = decodeURIComponent(path === '/' ? '/index.html' : path);
    if (
      decodedPath.split('/').some((part) => part.startsWith('.')) ||
      decodedPath.includes('\\')
    ) {
      json(response, 404, { message: 'Not found' });
      return;
    }
    const filename = resolve(root, '.' + decodedPath);
    if (!filename.startsWith(resolve(root) + sep)) {
      json(response, 404, { message: 'Not found' });
      return;
    }
    const content = await readFile(filename);
    const types = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
    };
    response.writeHead(200, {
      'Content-Type': types[extname(filename)] || 'text/plain',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  } catch (error) {
    console.error('Request failed:', error);
    json(response, error.code === 'ENOENT' ? 404 : 400, {
      message:
        error.code === 'ENOENT' ? 'Not found' : 'Unable to process the request',
    });
  }
}).listen(8090, '127.0.0.1', () => {
  console.log(
    'Open http://127.0.0.1:8090/example/16_server_files/example16.html'
  );
  console.log('Records and files are kept in memory until this process stops.');
});
