# استوديو شوب اب

One app for all of ShopUp's image tools. Each section was its own app before; they now share one link, one login and one image tray.

| Section | Was | What it does |
| --- | --- | --- |
| استخراج القطع | Fashion-Item-Extractor | Finds every piece in a model photo and makes a product photo of each one |
| غرفة القياس | Fashion-Try-On | Puts garments on a person or a mannequin, with pose, color and background edits |
| التلوين | Coloring | Recolors the main garment (the pose step moved to the poses section) |
| الوضعيات | AI-powered-poses | New pose or scene for a photo, including "pose only" presets |
| صور المنتجات | Product-Group-Shot | Studio product photos, one per product or a group shot, up to 4K |
| تحويل لـ JPG | AVIF-and-WebP-to-JPG-Converter- | Converts any image to JPG in the browser (nothing is uploaded) |

## The image tray

Every image a section makes is saved in the tray (IndexedDB in the browser, last 100 images), so it survives a page refresh. Under every result, **ابعت لقسم تاني** opens that image in another section without downloading and uploading it again, for example: extract a piece, try it on a mannequin, recolor it, change the pose, then convert to JPG. Uploaders also have **اختار من صندوق الصور**.

## Code layout

- `server.ts` login, static files, mounts the API
- `server/common.ts` Gemini client, input checks, Arabic errors, rate limit
- `server/routes.ts` every API route (`/api/generate`, `/api/style`, `/api/products/*`, `/api/coloring/*`, `/api/extractor/*`, `/api/tryon/*`)
- `src/App.tsx` header, section tabs; every section stays mounted so switching tabs keeps its work
- `src/studio/` tray storage, shared state, the tray / picker / send sheets
- `src/tools/<section>/` each section's UI
- `login.ts` in-page login form + 180-day session cookie (Bitwarden can fill it)

## Run

```bash
npm install
cp .env.example .env   # set GEMINI_API_KEY (and APP_PASSWORD to turn the login on)
npm run dev            # http://localhost:3000
npm run lint && npm run build && npm start
```

## Deploy

Portainer stack `ai-app-studio` from this repo's `docker-compose.yml`, Traefik router `ai-studio`, domain `studio.aaaaaaaaa9000.cloud`. Set `GEMINI_API_KEY` and `APP_PASSWORD` in the stack's environment variables.
