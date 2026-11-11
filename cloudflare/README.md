# Native Language Sync · Cloudflare Git auto-deploy

Current application: version 4.3, password-protected Cloudflare Worker, Groq Free API backend.

**One-time connection for the EXISTING Worker** (do not create a new project):

1. Visit https://dash.cloudflare.com/ and open **Workers & Pages**.
2. Open the existing Worker **native-language-sync-free**.
3. Open **Settings → Builds → Connect**.
4. Authorize GitHub, select repo **KAJITH95/native-language-sync**, branch **main**.
5. Set **Root directory** to `cloudflare` (important: repository root is an older unrelated app).
6. Set **Build command** to `npm run build`.
7. Set **Deploy command** to `npx wrangler deploy`.
8. Save the connection and run/trigger a build from Cloudflare. Cloudflare may wait for the next commit to trigger its first build.
9. Make sure existing runtime secrets **GROQ_API_KEY** and **SITE_PASSWORD** remain present in **Settings → Variables and Secrets**. Do not put secret values in GitHub or ChatGPT.
10. After the build succeeds, open the existing URL `https://native-language-sync-free.native-translator.workers.dev/` in an Incognito window and test password login, translation, logout.

Future changes committed to `cloudflare/` on `main` automatically rebuild/deploy using Workers Builds. No ZIP / BAT files needed.

**Note:** Connecting GitHub is an action you must complete in the Cloudflare dashboard because this chat has no access to the Cloudflare account. Code changes can be pushed to the linked GitHub repository through the GitHub connector. Existing Worker stays running until a Cloudflare deployment succeeds.

## Local test (optional)

`npm install`

`npm test`

`npm run build`

`npx wrangler dev` — local Worker (requires private `.dev.vars` values not committed to Git).

## Automatic deployment smoke check

Connected GitHub repository deployments should build from `main` with root directory `cloudflare`. This small documentation update is a safe commit to trigger and verify Cloudflare Workers Builds. Confirm success in Cloudflare's **Deployments / Builds** dashboard before assuming production was updated.

## Complete project guide (PDF)

The complete 15-page architecture, integrations, third-party links, setup, security, daily use, limitations and troubleshooting guide is available at [Native Language Sync - Complete Technical & User Guide](../docs/Native_Language_Sync_Complete_Technical_User_Guide.pdf) (source snapshot: `6bbbc77d8013`).

The runtime uses Groq + Cloudflare Workers. The PDF contains no production API secrets or passwords.
