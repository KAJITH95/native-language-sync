import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { runTranslation, HttpError } from '../api/translate.js';
import worker from '../worker/index.js';

const HOST='https://example.workers.dev';
const GOOD = { englishOutput: 'Hello, could you please tell me its status?', targetOutput: 'வணக்கம், இதன் நிலையைச் சொல்ல முடியுமா?', detectedLanguage: 'Mixed English and Romanized Tamil', toneNote:'Corrected grammar' };
const result = ()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(GOOD)}}]}),{status:200,headers:{'content-type':'application/json'}});
const env={GROQ_API_KEY:'TEST_GROQ_KEY_LONG_RANDOM_VALUE_FOR_SESSION',SITE_PASSWORD:'very-long-private-pw-2026!',ASSETS:{fetch:async()=>new Response('STATIC',{status:200,headers:{'Cache-Control':'public, max-age=1000'}})}};
const get=(path='/',cookie)=>new Request(HOST+path,{headers:cookie?{Cookie:cookie}:undefined});
const post=(path,body,opts={})=>new Request(HOST+path,{method:'POST',headers:{'Content-Type':opts.form?'application/x-www-form-urlencoded':'application/json','Origin':opts.origin||HOST,...(opts.cookie?{Cookie:opts.cookie}:{}),...(opts.ip?{'CF-Connecting-IP':opts.ip}:{}),...(opts.site?{'Sec-Fetch-Site':opts.site}:{}),...(opts.host?{'Host':opts.host}:{})},body:opts.form?new URLSearchParams(body):JSON.stringify(body)});
const login=async(password=env.SITE_PASSWORD,ip='127.0.0.101',environment=env)=>{
 const r=await worker.fetch(post('/auth/login',{password},{form:true,ip}),environment);
 return {response:r,cookie:r.headers.get('Set-Cookie')?.split(';')[0]||''};
};
const translate=(cookie,body={text:'hello, status solla mudiyuma?',target:'ta'})=>post('/api/translate',body,{cookie});

// Provider tests use mocks, not real Groq API calls.
test('Meaning-first translation sends mixed-language input to Groq and returns both translations',async()=>{
 const prev=globalThis.fetch;let captured;
 globalThis.fetch=async(url, options)=>{captured={url,...options};return result()};
 try {
  const r=await runTranslation({text:'hello, ithoda status ennanu solla mudiyuma',target:'ta',tone:'standard'},env.GROQ_API_KEY);
  assert.equal(r.englishOutput,GOOD.englishOutput);
  assert.equal(r.targetOutput,GOOD.targetOutput);
  assert.equal(r.provider.startsWith('GroqCloud Free'),true);
  assert.equal(captured.url,'https://api.groq.com/openai/v1/chat/completions');
  const req=JSON.parse(captured.body);
  assert.equal(req.model,'qwen/qwen3.8-27b');
  assert.match(req.messages[0].content,/Translate ONLY your corrected English/);
  assert.match(req.messages[1].content,/ithoda status/);
  assert.equal(captured.headers.Authorization,'Bearer '+env.GROQ_API_KEY);
 } finally {globalThis.fetch=prev}
});

test('A missing Groq key yields a helpful configuration error',async()=>{
 let failure;
 try{await runTranslation({text:'private key required',target:'ta',tone:'standard'},'')}catch(e){failure=e}
 assert.ok(failure instanceof HttpError);
 assert.equal(failure.status,503);
 assert.match(failure.message,/GROQ_API_KEY/);
});

test('Free quota returns a clear 429 without automatic charge',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'Rate limit reached'}}),{status:429});
 try {await assert.rejects(()=>runTranslation({text:'unique free tier rate limit',target:'fr'},env.GROQ_API_KEY),e=>e.status===429 && /Free API limit/.test(e.message))} finally{globalThis.fetch=previous}
});

test('Validation catches empty input and invalid target language',async()=>{
 await assert.rejects(()=>runTranslation({text:'',target:'ta'},env.GROQ_API_KEY),e=>e.status===400);
 await assert.rejects(()=>runTranslation({text:'hello',target:'../../private'},env.GROQ_API_KEY),e=>e.status===400);
});

test('Password protection denies anonymous assets and API calls',async()=>{
 const home=await worker.fetch(get('/'),env);
 assert.equal(home.status,200);
 assert.match(await home.text(),/Welcome back/);
 assert.match(home.headers.get('Cache-Control'),/no-store/);
 const js=await worker.fetch(get('/assets/main.js'),env);
 assert.equal(js.status,401);
 const api=await worker.fetch(get('/api/translate'),env);
 assert.equal(api.status,401);
 assert.match((await api.json()).error,/login required/);
 const noAuthPost=await worker.fetch(translate(''),env);
 assert.equal(noAuthPost.status,401);
});

test('Fail-closed when website password secret is missing, even if Groq is configured',async()=>{
 const envNoPassword={...env,SITE_PASSWORD:undefined};
 const home=await worker.fetch(get('/'),envNoPassword);
 assert.equal(home.status,200);
 assert.match(await home.text(),/Security setup required/);
 const api=await worker.fetch(get('/api/translate'),envNoPassword);
 assert.equal(api.status,401);
 const badLogin=await worker.fetch(post('/auth/login',{password:'abc'},{form:true,ip:'setup'}),envNoPassword);
 assert.equal(badLogin.status,503);
 const envNoGroq={...env,GROQ_API_KEY:undefined};
 assert.equal((await worker.fetch(get('/api/translate'),envNoGroq)).status,401);
});

test('Wrong password rejected, while correct password sets hardened session cookie',async()=>{
 const bad=await login('wrong password','badpw');
 assert.equal(bad.response.status,303);
 assert.equal(bad.response.headers.get('Location'),'/login?error=invalid');
 assert.equal(bad.cookie,'');
 const {response,cookie}=await login(env.SITE_PASSWORD,'goodpw');
 assert.equal(response.status,303);
 assert.equal(response.headers.get('Location'),'/');
 assert.match(cookie,/^__Host-nls_session=v1\.\d+\.[A-Za-z0-9_-]+$/);
 const setCookie=response.headers.get('Set-Cookie');
 for(const flag of ['Secure','HttpOnly','SameSite=Strict','Path=/'])assert.match(setCookie,new RegExp(flag));
 assert.doesNotMatch(setCookie,new RegExp(env.SITE_PASSWORD));
 assert.doesNotMatch(setCookie,new RegExp(env.GROQ_API_KEY));
});

test('Signed-in session unlocks static assets, health API and translated responses',async()=>{
 const {cookie}=await login(env.SITE_PASSWORD,'goodstatic');
 const home=await worker.fetch(get('/',cookie),env);
 assert.equal(home.status,200);
 assert.equal(await home.text(),'STATIC');
 assert.match(home.headers.get('Cache-Control'),/no-store/);
 assert.equal(home.headers.get('Vary'),'Cookie');
 const api=await worker.fetch(get('/api/translate',cookie),env);
 assert.equal(api.status,200);
 assert.equal((await api.json()).private,true);
 const prev=globalThis.fetch;
 globalThis.fetch=async()=>result();
 try{
  const response=await worker.fetch(translate(cookie),env);
  assert.equal(response.status,200);
  const output=await response.json();
  assert.equal(output.englishOutput,GOOD.englishOutput);
  assert.equal(output.targetOutput,GOOD.targetOutput);
  assert.equal(JSON.stringify(output).includes(env.GROQ_API_KEY),false);
  assert.equal(JSON.stringify(output).includes(env.SITE_PASSWORD),false);
 }finally{globalThis.fetch=prev}
});

test('Tampered or expired sessions cannot unlock the app',async()=>{
 const {cookie}=await login(env.SITE_PASSWORD,'tamper');
 const changed=cookie.slice(0,-1)+(cookie.at(-1)==='a'?'b':'a');
 assert.equal((await worker.fetch(get('/api/translate',changed),env)).status,401);
 const differentPassword={...env,SITE_PASSWORD:'different-long-password-value'};
 assert.equal((await worker.fetch(get('/api/translate',cookie),differentPassword)).status,401);
 const differentGroq={...env,GROQ_API_KEY:'ANOTHER_RANDOM_KEY_STRING_12345678'};
 assert.equal((await worker.fetch(get('/api/translate',cookie),differentGroq)).status,401);
 const originalNow=Date.now;
 try{Date.now=()=>originalNow()+25*60*60*1000;
  assert.equal((await worker.fetch(get('/api/translate',cookie),env)).status,401);
 }finally{Date.now=originalNow}
});

test('Cross-origin login/translation denied; logout clears cookie',async()=>{
 const bad=await worker.fetch(post('/auth/login',{password:env.SITE_PASSWORD},{form:true,origin:'https://attacker.invalid',ip:'cross'}),env);
 assert.equal(bad.status,403);
 const {cookie}=await login(env.SITE_PASSWORD,'goodorigin');
 const cross=await worker.fetch(post('/api/translate',{text:'hi',target:'ta'},{cookie,origin:'https://attacker.invalid'}),env);
 assert.equal(cross.status,403);
 const out=await worker.fetch(post('/auth/logout',{}, {cookie}),env);
 assert.equal(out.status,303);
 assert.equal(out.headers.get('Location'),'/login');
 assert.match(out.headers.get('Set-Cookie'),/Max-Age=0/);
});

test('Repeated invalid logins are rate-limited',async()=>{
 const ip='login-bruteforce-test';
 for(let i=0;i<8;i++)assert.equal((await login('wrong'+i,ip)).response.status,303);
 const last=await login('wrongagain',ip);
 assert.equal(last.response.status,429);
 assert.match(await last.response.text(),/Too many attempts/);
});


test('Wrangler config runs authentication before ALL static assets',async()=>{
 const {readFileSync}=await import('node:fs');
 const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(config.name,'native-language-sync-free');
 assert.equal(config.assets.run_worker_first,true);
 assert.equal(config.assets.binding,'ASSETS');
});

test('Chrome same-origin sign-in works despite Origin/edge URL mismatch (4.3 regression)',async()=>{
 const req=post('/auth/login',{password:env.SITE_PASSWORD},{form:true,origin:'https://native-language-sync-free.native-translator.workers.dev',site:'same-origin',ip:'chrome-origin-hotfix'});
 const response=await worker.fetch(req,env);
 assert.equal(response.status,303);
 assert.equal(response.headers.get('Location'),'/');
 assert.match(response.headers.get('Set-Cookie')||'',/__Host-nls_session=/);
});

test('Older browsers can use public Host header when edge URL is rewritten',async()=>{
 const req=post('/auth/login',{password:env.SITE_PASSWORD},{form:true,origin:'https://native-language-sync-free.native-translator.workers.dev',host:'native-language-sync-free.native-translator.workers.dev',ip:'host-fallback'});
 assert.equal((await worker.fetch(req,env)).status,303);
});

test('Browser cross-site/same-site form POST is denied even with a spoofed matching Origin',async()=>{
 for(const site of ['cross-site','same-site']) {
  const req=post('/auth/login',{password:env.SITE_PASSWORD},{form:true,origin:HOST,site,ip:'blocked-'+site});
  const result=await worker.fetch(req,env);
  assert.equal(result.status,403);
  assert.match(await result.text(),/browser blocked the sign-in request/i);
 }
});

test('Cross-site metadata cannot access signed-in translation endpoint',async()=>{
 const {cookie}=await login(env.SITE_PASSWORD,'metadata-session');
 for(const site of ['cross-site','same-site']){
  const req=post('/api/translate',{text:'status check',target:'ta'},{origin:HOST,site,cookie,ip:'api-'+site});
  assert.equal((await worker.fetch(req,env)).status,403);
 }
});


test('Email mode produces a complete English and localized email from mixed-language input',async()=>{
 const prev=globalThis.fetch;let captured;
 const reply={
   englishEmail:{subject:'Candidate Evaluation Feedback',greeting:'Hello,',body:'I would like to share my assessment of the candidate.\n\nThe candidate has 10 years of experience.\n- Communication: Good\n- Testing: Basic\n- Murex functional knowledge: Basic\n- Git knowledge: Basic\nTheir Murex knowledge is insufficient.',closing:'Best regards,',signature:'[Your Name]'},
   targetEmail:{subject:'후보자 평가 의견',greeting:'안녕하세요,',body:'후보자에 대한 평가를 공유드립니다.\n\n후보자는 10년의 경력이 있습니다.\n- 의사소통: 좋음\n- 테스팅: 기본\n- Murex 기능 지식: 기본\n- Git 지식: 기본\nMurex 지식이 충분하지 않습니다.',closing:'감사합니다,',signature:'[Your Name]'},
   detectedLanguage:'Mixed English + Romanized Tamil',toneNote:'Email draft'
 };
 globalThis.fetch=async(url,opt)=>{captured=JSON.parse(opt.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(reply)}}]}),{status:200});};
 try{
   const out=await runTranslation({text:'Intha candidate ku 10 years experience iruku but murex knowledge proper ah illa. Communication good, testing basic, Git basic.',target:'ko',tone:'email'},env.GROQ_API_KEY);
   assert.match(out.englishOutput,/^Subject: Candidate Evaluation Feedback\n\nHello,\n\n/);
   assert.match(out.englishOutput,/10 years of experience/);
   assert.match(out.englishOutput,/- Testing: Basic/);
   assert.match(out.englishOutput,/\n\nBest regards,\n\[Your Name\]$/);
   assert.match(out.targetOutput,/^Subject: 후보자 평가 의견\n\n안녕하세요,/);
   assert.match(out.targetOutput,/감사합니다,\n\[Your Name\]$/);
   assert.match(captured.messages[0].content,/COMPLETE, professional, ready-to-copy EMAIL DRAFT/);
   assert.match(captured.messages[0].content,/Never invent someone's name/);
 }finally{globalThis.fetch=prev}
});

test('Email renderer keeps safe subject and signature lines and wraps a model legacy fallback',async()=>{
 const old=globalThis.fetch;
 let count=0;
 globalThis.fetch=async()=>{
   count++;
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({englishOutput:'Please confirm whether the report has been approved.',targetOutput:'Veuillez confirmer si le rapport a été approuvé.',detectedLanguage:'English',toneNote:'Email draft'})}}]}),{status:200});
 };
 try {
   const r=await runTranslation({text:'Please confirm whether the report has been approved.',target:'fr',tone:'email'},env.GROQ_API_KEY);
   assert.match(r.englishOutput,/^Subject: Message\n\nHello,\n\nPlease confirm/);
   assert.match(r.englishOutput,/Best regards,\n\[Your Name\]$/);
   assert.match(r.targetOutput,/Subject: Message[\s\S]+Veuillez confirmer/);
   assert.equal(count,1);
 } finally {globalThis.fetch=old}
});

test('Email mode to English returns identical structured text in boxes 2 and 3',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({englishEmail:{subject:'Status Update',greeting:'Hello,',body:'Could you provide the current status?',closing:'Best regards,',signature:'[Your Name]'},targetEmail:{subject:'Status Update',greeting:'Hello,',body:'Could you provide the current status?',closing:'Best regards,',signature:'[Your Name]'},detectedLanguage:'Tanglish'})}}]}),{status:200});
 try{
   const r=await runTranslation({text:'Status ennanu solla mudiyuma?',target:'en',tone:'email'},env.GROQ_API_KEY);
   assert.equal(r.englishOutput,r.targetOutput);
   assert.match(r.englishOutput,/Subject: Status Update/);
 }finally{globalThis.fetch=old}
});


test('Romanized Tamil quality instructions preserve completed, affirmative build actions', async () => {
 const sample='Intha environment create panni 30 days ku mela aagirukathu naala auto-purge aagiruku. Naan innoru build trigger pannirukaen. once complete aanthum provide pannuraen.';
 const modelReply={
  englishOutput:"The environment has been automatically purged because it was created more than 30 days ago. I've triggered another build and will share it once it's complete.",
  targetOutput:"சுற்றுச்சூழல் உருவாக்கப்பட்டு 30 நாட்களுக்கு மேல் ஆனதால் தானாக நீக்கப்பட்டுள்ளது. நான் மீண்டும் ஒரு build தொடங்கியுள்ளேன். அது முடிந்ததும் பகிர்கிறேன்.",
  detectedLanguage:'Mixed English + Romanized Tamil',toneNote:'Professional'
 };
 const prev=globalThis.fetch;
 let body;
 globalThis.fetch=async (_url,opts)=>{
   body=JSON.parse(opts.body);
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(modelReply)}}]}),{status:200});
 };
 try {
  const answer=await runTranslation({text:sample,target:'ta',tone:'standard'},env.GROQ_API_KEY);
  assert.equal(answer.englishOutput,modelReply.englishOutput);
  assert.doesNotMatch(answer.englishOutput,/will not trigger/i);
  assert.match(body.messages[0].content,/NEVER reverse a claim's polarity/);
  assert.match(body.messages[0].content,/pannirukaen\/pannirukken/);
  assert.match(body.messages[0].content,/auto-purge aagiruku/);
  assert.match(body.messages[0].content,/Final silent quality check/);
  assert.match(body.messages[1].content,/Naan innoru build trigger pannirukaen/);
  assert.match(body.messages[1].content,/BEGIN SOURCE/);
 } finally {globalThis.fetch=prev;}
});

test('Positive and negative romanized Tamil examples are explicitly contrasted in the model instructions', async () => {
 const prev=globalThis.fetch; let prompt='';
 globalThis.fetch=async (_url,opts)=>{
  prompt=JSON.parse(opts.body).messages[0].content;
  return result();
 };
 try {
  await runTranslation({text:'naan innoru build trigger pannala',target:'fr',tone:'formal'},env.GROQ_API_KEY);
  assert.match(prompt,/I haven't triggered another build/);
  assert.match(prompt,/I've triggered another build/);
  assert.match(prompt,/do not turn a factual update into a hypothetical rule/i);
 } finally {globalThis.fetch=prev;}
});
