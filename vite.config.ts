import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { runTranslation, HttpError } from './api/translate.js';

// Local Vite dev API uses GROQ_API_KEY from the server process (never bundled).
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-translation-api',
      configureServer(server) {
        server.middlewares.use('/api/translate', async (req, res) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          try {
            const chunks: Buffer[] = [];
            let length = 0;
            for await (const chunk of req) {
              const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              length += buf.length;
              if (length > 20000) throw new HttpError(413, 'Request too large');
              chunks.push(buf);
            }
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const result = await runTranslation(body);
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = error instanceof HttpError ? error.status : 500;
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Translation unavailable' }));
          }
        });
      }
    }
  ],
  server: { port: 5173 },
});
