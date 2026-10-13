import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Dev-mode middleware to serve /api/health locally in Vite
 * mimicking the Cloudflare Pages serverless function environment
 */
function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Health endpoint quick bypass
        if (req.url === '/api/health' || req.url?.startsWith('/api/health?')) {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              service: 'The Inspire Business Academy',
              phase: 'Phase 11 - Security + Performance + QA',
              status: 'healthy',
              environment: 'development',
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        // Generic /api/* handler for server functions locally
        if (req.url?.startsWith('/api/')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const pathname = urlObj.pathname;
          let bodyBuffer = '';
          req.on('data', (chunk) => {
            bodyBuffer += chunk;
          });

          req.on('end', async () => {
            try {
              const body = bodyBuffer ? JSON.parse(bodyBuffer) : {};
              const modulePath = path.resolve(process.cwd(), '.' + pathname + '.ts');
              const mod = await import(modulePath);
              const handler = mod.default;

              const resMock = {
                setHeader: (key: string, val: string) => res.setHeader(key, val),
                status: (code: number) => ({
                  json: (data: any) => {
                    res.statusCode = code;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end: () => {
                    res.statusCode = code;
                    res.end();
                  },
                }),
                end: () => res.end(),
              };

              await handler({ method: req.method, body, url: req.url, headers: req.headers }, resMock);
            } catch (err: any) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: err.message || 'API handler not found' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/motion')) {
              return 'vendor-motion';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
