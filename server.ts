import express from 'express';
import path from 'path';
import { installLogin } from './login';
import { ANALYZE_MODEL, HQ_IMAGE_MODEL, IMAGE_MODEL, MAX_IMAGE_MB, RATE_LIMIT_PER_MINUTE, STYLE_MODEL } from './server/common';
import { api } from './server/routes';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const APP_USERNAME = process.env.APP_USERNAME || 'user';
const APP_PASSWORD = process.env.APP_PASSWORD || '';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Health check (before auth so Docker/Traefik can reach it)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // In-page login form + session cookie (only when APP_PASSWORD is set)
  installLogin(app, { appName: 'استوديو شوب اب', username: APP_USERNAME, password: APP_PASSWORD, accent: '#9C3548' });

  // A group shot sends up to 8 (already downscaled) photos plus a style image.
  app.use('/api', express.json({ limit: `${Math.max(50, MAX_IMAGE_MB * 3)}mb` }), api);

  if (IS_PROD) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true }));
    app.use(express.static(distPath, { index: false, maxAge: '1d' }));
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Studio on :${PORT} | image: ${IMAGE_MODEL} | hq: ${HQ_IMAGE_MODEL} | style: ${STYLE_MODEL} | analyze: ${ANALYZE_MODEL} | ` +
        `auth: ${APP_PASSWORD ? 'on' : 'off'} | rate limit: ${RATE_LIMIT_PER_MINUTE}/min | ` +
        `key: ${process.env.GEMINI_API_KEY ? 'set' : 'MISSING'}`,
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
