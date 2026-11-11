# Native Language Sync — Version 4.3 (Cloudflare + Groq Free)

This is the **current, password-protected Native Language Sync translator**. The older Gemini/AI Studio application was replaced at the repository root on 2026-11-11 to eliminate deployment ambiguity.

## Architecture
- React + Vite, source at `src/`.
- Secure Cloudflare Worker in `worker/index.js`, with Groq translation backend in `api/translate.js`.
- Authentication is enforced on **both HTML assets and API**. Set Cloudflare runtime secrets `SITE_PASSWORD` and `GROQ_API_KEY` using Cloudflare Settings → Variables and Secrets. **Never commit secrets.**
- Auto translation: mixed-language input → refined English → selected native output.

## GitHub → Cloudflare Workers Builds
The **same Version 4.3 files** are available at the repository root **and** in `cloudflare/` to support both existing build-root configurations.

**Option A (recommended long-term):** Root directory unset / `/`.

**Option B (existing prior setup):** Root directory `cloudflare`.

In either case, configure:
- Production branch: `main`
- Build: `npm run build`
- Deploy: `npx wrangler deploy`

The `wrangler.jsonc` in **both** directories deploys the same Worker named `native-language-sync-free` with `run_worker_first: true` and its local build assets.

The live URL is https://native-language-sync-free.native-translator.workers.dev/ . Verify actual deployment in Cloudflare's Builds/Deployments view and test the login flow. A GitHub commit by itself does **not** prove live production was updated.

## Run checks
```sh
npm install
npm test
npm run build
```

Privacy/security: don't expose any API keys or passwords in GitHub, screenshots, or chat.
