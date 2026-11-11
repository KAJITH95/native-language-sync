import { runTranslation, HttpError } from '../api/translate.js';

const VERSION = '4.3.0';
const COOKIE = '__Host-nls_session';
const SESSION_SECONDS = 24 * 60 * 60;
const encoder = new TextEncoder();
const IP_HITS = new Map();
const LOGIN_HITS = new Map();

const secureHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
};
const json = (body, status=200, headers={}) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type':'application/json; charset=utf-8',...secureHeaders,...headers},
});
const redirect = (path,headers={}) => new Response(null,{
  status:303,headers:{Location:path,...secureHeaders,...headers},
});

function isConfigured(env) {
  return typeof env.SITE_PASSWORD === 'string' && env.SITE_PASSWORD.length >= 10 &&
    typeof env.GROQ_API_KEY === 'string' && env.GROQ_API_KEY.length > 0;
}
function checkOrigin(request) {
  // Browser Fetch Metadata is more reliable than comparing Origin with request.url
  // behind some edge/proxy URL rewrites. The browser sets Sec-Fetch-Site and web
  // scripts cannot change this forbidden request header.
  const site = (request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  if (site === 'cross-site' || site === 'same-site') {
    throw new HttpError(403, 'Cross-site requests are not permitted.');
  }
  if (site === 'same-origin') return;
  // Fallback for older clients without Fetch Metadata. Also accept the incoming
  // public Host header when the edge provides a rewritten request URL.
  const origin = request.headers.get('Origin');
  if (origin) {
    let safe = false;
    try {
      const supplied = new URL(origin).origin;
      const urlOrigin = new URL(request.url).origin;
      const incomingHost = request.headers.get('Host');
      const hostOrigin = incomingHost ? new URL('https://' + incomingHost).origin : null;
      safe = supplied === urlOrigin || (hostOrigin !== null && supplied === hostOrigin);
    } catch {}
    if (!safe) throw new HttpError(403, 'Cross-site requests are not permitted.');
  }
  if (site && site !== 'none') {
    throw new HttpError(403, 'Unsupported request context.');
  }
}
function ipCounter(map,request,max,windowMs) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  if (map.size > 3000) map.clear();
  const value = map.get(ip);
  if (!value || now - value.started > windowMs) {
    map.set(ip,{started:now,count:1});
    return;
  }
  value.count += 1;
  if(value.count>max) throw new HttpError(429,'Too many attempts. Please try again later.');
}
function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeB64url(value) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  try {
    const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }catch{return null;}
}
async function sessionKey(env) {
  // Both values remain encrypted Worker secrets; the API key supplies high entropy.
  // Domain separation ensures the API credential is never used directly as a cookie.
  const material=encoder.encode(`NLS_SESSION_V1\0${env.GROQ_API_KEY}\0${env.SITE_PASSWORD}`);
  const derived=await crypto.subtle.digest('SHA-256',material);
  return crypto.subtle.importKey('raw',derived,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function newSession(env) {
  const expiry=Math.floor(Date.now()/1000)+SESSION_SECONDS;
  const message=`v1.${expiry}`;
  const mac=await crypto.subtle.sign('HMAC',await sessionKey(env),encoder.encode(message));
  return `${message}.${b64url(new Uint8Array(mac))}`;
}
async function signedIn(request,env) {
  if(!isConfigured(env)) return false;
  const cookie=request.headers.get('Cookie') || '';
  const match=cookie.match(/(?:^|;\s*)__Host-nls_session=([^;]+)/);
  if(!match || match[1].length>160) return false;
  const parts=match[1].split('.');
  if(parts.length!==3 || parts[0]!=='v1' || !/^\d{10}$/.test(parts[1])) return false;
  const expiry=Number(parts[1]);
  const now=Math.floor(Date.now()/1000);
  if(expiry<=now || expiry>now+SESSION_SECONDS) return false;
  const mac=decodeB64url(parts[2]);
  if(!mac) return false;
  return crypto.subtle.verify('HMAC',await sessionKey(env),mac,encoder.encode(`v1.${parts[1]}`));
}
async function equalPasswords(a,b) {
  const [x,y]=await Promise.all([
    crypto.subtle.digest('SHA-256',encoder.encode(a)),
    crypto.subtle.digest('SHA-256',encoder.encode(b)),
  ]);
  const xa=new Uint8Array(x),ya=new Uint8Array(y);
  let unequal=0;
  for(let i=0;i<xa.length;i++) unequal|=xa[i]^ya[i];
  return unequal===0;
}
function loginPage({error='',setup=false}={}) {
  const notice=setup
    ? '<p class="alert">Website locked for setup. Add a strong <code>SITE_PASSWORD</code> Cloudflare secret (10+ characters) and keep your existing <code>GROQ_API_KEY</code> secret.</p>'
    : error==='origin'
      ? '<p class="alert" role="alert">Your browser blocked the sign-in request. Open the website directly in a new tab, refresh, and try again.</p>'
      : error==='rate'
      ? '<p class="alert" role="alert">Too many attempts. Please try again later.</p>'
      : error==='invalid'
        ? '<p class="alert" role="alert">Incorrect password. Please try again.</p>'
        : '';
  const form=setup?'<p class="tip">For security, the website stays inaccessible until its secrets are configured. See the setup instructions in the ZIP.</p>':
    `<form action="/auth/login" method="post" autocomplete="on">
      <label for="password">WEBSITE PASSWORD</label>
      <div class="field"><input id="password" name="password" type="password" placeholder="Enter your password" required autofocus autocomplete="current-password" maxlength="256"/><button type="button" id="toggle" aria-label="Show password" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password';this.textContent=this.previousElementSibling.type==='password'?'Show':'Hide'">Show</button></div>
      <button class="submit" type="submit">Unlock workspace &nbsp; →</button>
    </form>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>Private Login · Native Language Sync</title>
<style>
*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 10% 15%,#edeaff 0,transparent 38%),radial-gradient(ellipse at 92% 85%,#e5f7f4 0,transparent 34%),#f8f9fd;color:#262747;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}.card{width:min(440px,100%);background:white;border:1px solid #e7e9f2;border-radius:22px;padding:36px;box-shadow:0 20px 60px #2827650d}.logo{display:flex;gap:12px;align-items:center}.mark{display:grid;place-items:center;width:45px;height:45px;border-radius:14px;background:linear-gradient(135deg,#887aff,#5a48df);color:white;font-weight:900;font-size:24px}.wordmark{font-size:22px;font-weight:850;letter-spacing:-1px}.wordmark span{color:#6755e6}.caption{font-size:9px;color:#858ba5;letter-spacing:1.9px;font-weight:800;margin-top:2px}h1{font-size:25px;letter-spacing:-.8px;margin:36px 0 8px}p.desc{font-size:13px;line-height:1.7;color:#8589a0;margin:0 0 25px}label{display:block;color:#666b87;font-size:10px;font-weight:800;letter-spacing:1.6px;margin:0 0 9px}.field{display:flex;border:1px solid #dde0ed;border-radius:11px;overflow:hidden;align-items:center;background:#fcfcff}.field:focus-within{outline:2px solid #a59aff}.field input{border:0;background:transparent;flex:1;min-width:0;padding:16px;font:inherit;font-size:14px;outline:none}.field button{border:0;background:transparent;color:#7164ce;font-size:12px;padding:13px;cursor:pointer}.submit{width:100%;margin-top:16px;background:linear-gradient(100deg,#7562ed,#5c4cda);border:0;border-radius:11px;color:white;font-size:13px;font-weight:750;padding:16px;cursor:pointer}.alert{color:#a12d4a;background:#fff0f3;border:1px solid #f3cbd3;border-radius:10px;font-size:12px;line-height:1.7;padding:12px 14px;margin:0 0 16px}.alert code{font-size:11px}.tip{font-size:12px;line-height:1.7;color:#71758d;margin:0}footer{margin-top:24px;padding-top:18px;border-top:1px solid #eceef5;font-size:11px;color:#9398a9;text-align:center}
</style></head><body><main class="card"><div class="logo"><div class="mark">✦</div><div><div class="wordmark">native<span>sync</span></div><div class="caption">PRIVATE LANGUAGE WORKSPACE</div></div></div><h1>${setup?'Security setup required':'Welcome back'}</h1><p class="desc">${setup?'This workspace is locked until your private password is configured.':'Your translation workspace is password-protected. Sign in to continue.'}</p>${notice}${form}<footer>Private access · Secured with Cloudflare Workers</footer></main></body></html>`;
}
function html(content,status=200) {
  return new Response(content,{status,headers:{
    'Content-Type':'text/html; charset=utf-8',
    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    ...secureHeaders,
  }});
}
function unauthorized(request,setup=false) {
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/')) return json({success:false,error:'Password login required.'},401);
  if(path==='/login' || path==='/' || path==='/index.html' || (request.headers.get('Accept')||'').includes('text/html')) {
    return html(loginPage({setup}));
  }
  return new Response('Login required',{status:401,headers:secureHeaders});
}

export default {
  async fetch(request,env) {
    const path=new URL(request.url).pathname;
    const configured=isConfigured(env);
    try {
      if(path==='/auth/login' && request.method==='POST') {
        checkOrigin(request);
        if(!configured) return html(loginPage({setup:true}),503);
        ipCounter(LOGIN_HITS,request,8,10*60_000);
        if(Number(request.headers.get('Content-Length'))>1024) throw new HttpError(413,'Login request too long.');
        const raw=await request.text();
        if(encoder.encode(raw).length>1024) throw new HttpError(413,'Login request too long.');
        const submitted=new URLSearchParams(raw).get('password')||'';
        const correct=submitted.length<=256 && await equalPasswords(submitted,env.SITE_PASSWORD);
        if(!correct) return redirect('/login?error=invalid');
        // A successful login resets this best-effort per-instance rate limit.
        const ip=request.headers.get('CF-Connecting-IP')||'unknown';
        LOGIN_HITS.delete(ip);
        const token=await newSession(env);
        return redirect('/',{'Set-Cookie':`${COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict`});
      }
      if(path==='/auth/logout' && request.method==='POST') {
        checkOrigin(request);
        return redirect('/login',{'Set-Cookie':`${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`});
      }
      if(path==='/login') {
        if(!configured) return html(loginPage({setup:true}),503);
        if(await signedIn(request,env)) return redirect('/');
        const error=new URL(request.url).searchParams.get('error');
        return html(loginPage({error:error==='invalid'?'invalid':''}));
      }
      if(!configured) return unauthorized(request,true);
      if(!await signedIn(request,env)) return unauthorized(request,false);
      if(path==='/api/translate') {
        if(request.method==='GET') return json({ok:true,version:VERSION,provider:'GroqCloud Free',gemini:false,configured:true,private:true});
        if(request.method!=='POST') return json({success:false,error:'Method not allowed.'},405);
        checkOrigin(request);
        ipCounter(IP_HITS,request,12,60_000);
        if(Number(request.headers.get('Content-Length'))>12000) throw new HttpError(413,'Message too long.');
        const raw=await request.text();
        if(encoder.encode(raw).length>12000) throw new HttpError(413,'Message too long.');
        let body;
        try{body=JSON.parse(raw);}catch{throw new HttpError(400,'Invalid JSON request.');}
        return json(await runTranslation(body,env.GROQ_API_KEY));
      }
      if(path.startsWith('/api/') || path.startsWith('/auth/')) return json({success:false,error:'Not found'},404);
      if(request.method!=='GET' && request.method!=='HEAD') return new Response('Method not allowed',{status:405,headers:secureHeaders});
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      for(const [key,value] of Object.entries(secureHeaders)) headers.set(key,value);
      headers.set('Vary','Cookie');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }catch(error) {
      const status=error instanceof HttpError?error.status:500;
      if(status===500) console.error('Private Worker error:',error?.name||'Unexpected');
      if(path==='/auth/login' && status===403) return html(loginPage({error:'origin'}),403);
      if(path==='/auth/login' && status===429) return html(loginPage({error:'rate'}),429);
      return json({success:false,error:error instanceof HttpError?error.message:'Service unavailable. Please retry.'},status);
    }
  }
};
