import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeftRight, ArrowRight, BookOpen, Check, ChevronDown,
  Clipboard, Clock3, Copy, Download, Earth, FileText, Globe2, History,
  Languages, Lightbulb, LoaderCircle, LogOut, Menu, Mic, Moon,
  MoveUpRight, RotateCcw, Search, ShieldCheck, Sun, Trash2,
  Volume2, WandSparkles, WifiOff, X
} from 'lucide-react';
import { COUNTRIES } from './data/countries';
import type { EnglishTone } from './types';

type HistoryEntry = {
  id: string; text: string; english: string; output: string; source: string;
  target: string; country: string; targetName: string; time: number;
};
type APIResult = {
  englishOutput: string; targetOutput: string; detectedLanguage: string;
  detectedCode: string; provider: string; toneNote: string; usageNote: string; targetWarning?: string;
};
const TONES: {id:EnglishTone;name:string;detail:string}[] = [
  {id:'standard',name:'Standard',detail:'Meaning-first English with corrected grammar'},
  {id:'formal',name:'Formal',detail:'Polished professional English'},
  {id:'casual',name:'Casual',detail:'Natural conversational English'},
  {id:'email',name:'Email',detail:'Complete email draft: Subject, greeting, body and sign-off'},
];
const STORE = 'nls_v2_';
function readStore<T>(key: string, fallback: T): T {
  try {const s = window.localStorage.getItem(STORE+key); return s ? JSON.parse(s) as T : fallback;} catch {return fallback;}
}
function shortLang(code: string): string {return code.split('-')[0];}
function locale(code: string): string {
  const base = shortLang(code);
  const overrides:Record<string,string> = {ta:'ta-IN',hi:'hi-IN',te:'te-IN',ml:'ml-IN',kn:'kn-IN',bn:'bn-IN',ar:'ar-SA',ja:'ja-JP',zh:'zh-CN',ko:'ko-KR',en:'en-US',fr:'fr-FR',es:'es-ES'};
  return overrides[base] || base;
}
function timeAgo(time:number):string {
  const diff = Date.now()-time;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return new Date(time).toLocaleDateString();
}
export default function App() {
  const [dark, setDark] = useState(() => readStore('dark', false));
  const [input, setInput] = useState('');
  const source = 'auto'; // Always detect language and mixed-language meaning automatically.
  const [country, setCountry] = useState(() => readStore('country','IN'));
  const [target, setTarget] = useState(() => readStore('target','ta'));
  const [tone, setTone] = useState<EnglishTone>('standard');
  const [english, setEnglish] = useState('');
  const [localized, setLocalized] = useState('');
  const [detected, setDetected] = useState('');
  const [toneNote, setToneNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>(() => readStore('history',[]));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [recording, setRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const controller = useRef<AbortController|null>(null);
  const revision = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const speechRef = useRef<{stop:()=>void}|null>(null);

  const selectedCountry = COUNTRIES.find(x=>x.code===country) || COUNTRIES[0];
  const selectedLanguage = selectedCountry.languages.find(x=>x.code===target) || selectedCountry.languages[0];
  const actualTarget = selectedLanguage.code;
  const canTranslate = input.trim().length>0 && input.length<=1800;
  const isEmpty = !input.trim();

  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem(STORE+'dark',JSON.stringify(dark));},[dark]);
  useEffect(()=>{localStorage.setItem(STORE+'history',JSON.stringify(history.slice(0,25)));},[history]);
  useEffect(()=>{localStorage.setItem(STORE+'country',JSON.stringify(country));localStorage.setItem(STORE+'target',JSON.stringify(target));},[country,target]);
  useEffect(()=>()=>{controller.current?.abort(); speechRef.current?.stop(); if(toastTimer.current)clearTimeout(toastTimer.current);},[]);

  const notify = useCallback((message:string)=>{
    setToast(message);
    if(toastTimer.current)clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(''),3500);
  },[]);
  const invalidate = useCallback(()=>{
    revision.current++;
    controller.current?.abort();
    controller.current=null;
    setBusy(false);setError('');setEnglish('');setLocalized('');setDetected('');setToneNote('');
  },[]);
  const changeInput = (value:string)=>{invalidate();setInput(value);};
  const changeTone = (value:EnglishTone)=>{invalidate();setTone(value);};
  const changeCountry = (value:string)=>{
    const entry = COUNTRIES.find(c=>c.code===value) || COUNTRIES[0];
    invalidate();setCountry(entry.code);setTarget(entry.defaultLanguageCode || entry.languages[0].code);setFilterOpen(false);setCountryFilter('');
  };
  const changeLanguage = (value:string)=>{invalidate();setTarget(value);};
  const reset = ()=>{invalidate();setInput('');notify('Workspace reset');setMenuOpen(false);};
  const translate = useCallback(async (text:string,sourceCode:string,targetCode:string,selectedTone:EnglishTone,countryCode:string)=>{
    if (!text.trim() || text.length>1800) return;
    controller.current?.abort();
    const abort = new AbortController();controller.current=abort;
    const thisRevision=++revision.current;
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/translate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        signal:abort.signal,body:JSON.stringify({text,source:sourceCode,target:targetCode,tone:selectedTone})
      });
      // Free AI service or a failed serverless function may return text/HTML instead of JSON.
      // Parse defensively so the UI shows a meaningful error, not SyntaxError.
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
      const raw=await response.text();
      let data: (APIResult & {error?:string}) | null = null;
      try {
        data=JSON.parse(raw) as APIResult & {error?:string};
      } catch {
        throw new Error(response.ok
          ? 'The translation server returned an invalid response. Please retry.'
          : `Translation server unavailable (HTTP ${response.status}). Please retry in a moment.`);
      }
      if(!response.ok || !data?.englishOutput) {
        throw new Error(data?.error || `Translation failed (HTTP ${response.status}). Please try again.`);
      }
      if(thisRevision!==revision.current || abort.signal.aborted)return;
      setEnglish(data.englishOutput);setLocalized(data.targetOutput);setDetected(data.detectedLanguage);setToneNote(data.toneNote);setError(data.targetWarning||'');
      const countryData=COUNTRIES.find(x=>x.code===countryCode)||COUNTRIES[0];
      const language=countryData.languages.find(x=>x.code===targetCode)||countryData.languages[0];
      const entry:HistoryEntry={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,text,english:data.englishOutput,output:data.targetOutput,source:sourceCode,target:targetCode,country:countryCode,targetName:language.name,time:Date.now()};
      if(data.targetOutput)setHistory(prev=>[entry,...prev.filter(h=>h.text!==text||h.target!==targetCode)].slice(0,25));
    } catch(e) {
      if(abort.signal.aborted || thisRevision!==revision.current)return;
      setEnglish('');setLocalized('');setDetected('');
      setError(e instanceof Error?e.message:'Translation unavailable. Please retry.');
    }finally {if(thisRevision===revision.current){setBusy(false);controller.current=null;}}
  },[]);
  useEffect(()=>{
    if(!canTranslate)return;
    // Translate only after the user pauses typing, to avoid one API request per keystroke.
    const timer=setTimeout(()=>translate(input,source,actualTarget,tone,country),1250);
    return()=>clearTimeout(timer);
  },[input,source,actualTarget,tone,country,canTranslate,translate]);

  const copy = async(text:string,label='Text')=>{
    if(!text)return;
    try{await navigator.clipboard.writeText(text);notify(`${label} copied`);}catch{notify('Clipboard unavailable; select and copy the text.');}
  };
  const speak=(text:string,code:string)=>{
    if(!text)return;
    if(!('speechSynthesis' in window)){notify('Text-to-speech is not supported in this browser.');return;}
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang=locale(code==='tanglish'?'ta':code==='auto'?(detected==='Tamil'?'ta':'en'):code);
    utterance.rate=.92;
    window.speechSynthesis.speak(utterance);
  };
  const toggleMic=()=>{
    if(recording){speechRef.current?.stop();setRecording(false);return;}
    const BrowserRecognition=(window as unknown as {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any}).SpeechRecognition||(window as unknown as {webkitSpeechRecognition?:new()=>any}).webkitSpeechRecognition;
    if(!BrowserRecognition){notify('Mic needs Chrome/Edge and microphone permission.');return;}
    try{
      const recognition=new BrowserRecognition();
      recognition.lang=navigator.language||'en-IN'; // Speech APIs usually require one microphone language; typed text is universal.
      recognition.interimResults=false;recognition.continuous=false;
      recognition.onresult=(event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>{
        const spoken=event.results[0]?.[0]?.transcript||'';
        if(spoken)changeInput(input?`${input} ${spoken}`:spoken);
      };
      recognition.onend=()=>setRecording(false);
      recognition.onerror=()=>{setRecording(false);notify('Microphone could not capture speech.');};
      recognition.start();speechRef.current=recognition;setRecording(true);
    }catch{notify('Could not access microphone.');}
  };
  const download=()=>{
    if(!english&&!localized)return;
    const content=`NATIVE LANGUAGE SYNC\n=====================\n\nOriginal (${source}):\n${input}\n\nEnglish:\n${english}\n\n${selectedLanguage.name} (${selectedCountry.name}):\n${localized}\n\nGenerated with Native Language Sync. Verify important details.\n`;
    const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='native-language-sync-translation.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('Translation downloaded');
  };
  const restore=(h:HistoryEntry)=>{
    invalidate();setInput(h.text);setEnglish(h.english);setLocalized(h.output);
    setCountry(h.country);setTarget(h.target);setDetected('Restored from history');
    setHistoryOpen(false);notify('Translation restored');
  };
  const switchTargetToEnglish=()=>{
    invalidate();setInput(localized||english||input);setCountry('IN');setTarget('ta');
  };
  const visibleCountries=COUNTRIES.filter(c=>c.name.toLowerCase().includes(countryFilter.toLowerCase()) || c.languages.some(l=>l.name.toLowerCase().includes(countryFilter.toLowerCase())));

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="nav-container">
          <a className="brand" href="#top" aria-label="Native Language Sync home">
            <span className="brand-symbol"><Languages size={23} strokeWidth={2.4}/></span>
            <span className="brand-copy"><strong>native<span>sync</span></strong><small>LANGUAGE WORKSPACE</small></span>
          </a>
          <div className="nav-links">
            <a className="nav-link active" href="#workspace">Workspace</a>
            <button className="nav-link" onClick={()=>setShowInfo(true)}>How it works</button>
            <span className="nav-separator"/>
            <button className="nav-icon-button" title="Toggle color theme" onClick={()=>setDark(!dark)} aria-label={dark?'Light theme':'Dark theme'}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button>
            <button className="history-button" onClick={()=>setHistoryOpen(true)}><History size={17}/><span>History</span>{history.length>0&&<i>{history.length}</i>}</button>
            <form action="/auth/logout" method="POST"><button type="submit" className="nav-lock-button" title="Lock this workspace"><LogOut size={16}/> Log out</button></form>
          </div>
          <div className="mobile-links">
            <button className="nav-icon-button" onClick={()=>setDark(!dark)} aria-label="Toggle theme">{dark?<Sun size={20}/>:<Moon size={20}/>}</button>
            <button className="nav-icon-button" onClick={()=>setHistoryOpen(true)} aria-label="Translation history"><History size={20}/></button>
            <button className="nav-icon-button" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen?<X size={21}/>:<Menu size={21}/>}</button>
          </div>
        </div>
        {menuOpen&&<div className="mobile-dropdown"><a href="#workspace" onClick={()=>setMenuOpen(false)}>Workspace</a><button onClick={()=>{setShowInfo(true);setMenuOpen(false);}}>How it works</button><button onClick={reset}>Reset workspace</button><form action="/auth/logout" method="POST"><button type="submit"><LogOut size={16}/> Log out</button></form></div>}
      </header>
      <main id="top">
        <section id="workspace" className="workspace-section">
          <div className="workspace-intro">
            <div><span className="section-label"><span className="purple-circle"/> YOUR TRANSLATION STUDIO</span><h2>Make every word count<span className="dot">.</span></h2><p>Write in any language. We’ll correct the English and translate the meaning to your destination language.</p></div>
            <div className="workspace-toolbar">
              <span className="auto-indicator" title="Translation starts automatically when you pause typing"><span className="auto-indicator-dot"/> Auto translate on</span>
              <button className="toolbar-reset" onClick={reset}><RotateCcw size={15}/> Reset</button>
            </div>
          </div>
          <div className="flow-description"><div><span className="flow-dot purple"/> 01 — ORIGINAL</div><ArrowRight size={16}/><div><span className="flow-dot blue"/> 02 — ENGLISH</div><ArrowRight size={16}/><div><span className="flow-dot green"/> 03 — LOCALIZED</div></div>
          <div className="workspace-grid">
            <article className="translation-card original-card">
              <div className="card-top"><div className="card-title"><span className="step-icon step-violet"><FileText size={18}/></span><div><h3>Your words</h3><p>Type naturally · Any language</p></div></div><span className="step-counter">01 / 03</span></div>
              <div className="control-group"><label>INPUT LANGUAGE</label><div className="auto-language-label"><Globe2 size={17}/><span>Automatic detection · Any language or mixed text</span><Check size={16}/></div></div>
              <div className="editor-wrap"><textarea aria-label="Original text" maxLength={1800} placeholder="Type in any language, spelling or script…\n\nMixed English, Tamil, Hindi and other languages are welcome." value={input} onChange={e=>changeInput(e.target.value)}/></div>
              <div className="card-bottom"><div className="input-actions"><button className={recording?'square-button recording':'square-button'} onClick={toggleMic} title={recording?'Stop recording':'Use microphone'} aria-label="Voice input"><Mic size={17}/></button><button className="square-button" onClick={async()=>{try{changeInput(await navigator.clipboard.readText());notify('Pasted from clipboard');}catch{notify('Use Ctrl+V to paste');}}} title="Paste" aria-label="Paste input"><Clipboard size={17}/></button><button className="square-button" onClick={()=>speak(input,source)} disabled={!input} title="Read aloud" aria-label="Speak original"><Volume2 size={17}/></button><button className="square-button" onClick={()=>changeInput('')} disabled={!input} title="Clear input" aria-label="Clear input"><X size={17}/></button></div><span className="char-count">{input.length} / 1,800</span></div>
              <p className="card-note"><Lightbulb size={14}/> Write naturally, even with mixed languages or imperfect grammar. Meaning and languages are detected automatically.</p>
            </article>
            <article className="translation-card english-card">
              <div className="card-top"><div className="card-title"><span className="step-icon step-blue"><WandSparkles size={18}/></span><div><h3>In English</h3><p>Meaning-first · Grammar-corrected</p></div></div><span className="step-counter">02 / 03</span></div>
              <div className="control-group"><label>ENGLISH WRITING STYLE <span className="soft-tag">{tone==='email'?'Full email: subject · greeting · body · sign-off':'AI grammar correction'}</span></label><div className="tone-switch" role="group" aria-label="English format">{TONES.map(t=><button key={t.id} className={tone===t.id?'tone-option selected':'tone-option'} onClick={()=>changeTone(t.id)} title={t.detail}>{t.name}</button>)}</div></div>
              <div className="output-box"><div className="output-content">{busy?<div className="loading-content"><LoaderCircle size={23} className="spin"/><p>Finding the right words…</p></div>:english?<p>{english}</p>:<div className="empty-state"><span className="empty-icon"><Languages size={26}/></span><strong>English translation</strong><small>We’ll understand your message and rewrite it in clear English.</small></div>}</div></div>
              <div className="card-bottom"><div className="input-actions"><button className="square-button" onClick={()=>copy(english,'English translation')} disabled={!english} title="Copy English" aria-label="Copy English"><Copy size={17}/></button><button className="square-button" onClick={()=>speak(english,'en')} disabled={!english} title="Listen to English" aria-label="Speak English"><Volume2 size={17}/></button></div><span className="word-count">{english?`${english.trim().split(/\s+/).length} words`:'Awaiting input'}</span></div>
            </article>
            <article className="translation-card target-card">
              <div className="card-top"><div className="card-title"><span className="step-icon step-teal"><Earth size={19}/></span><div><h3>Around the world</h3><p>Translate for your destination</p></div></div><span className="step-counter">03 / 03</span></div>
              <div className="country-language-grid"><div className="control-group"><label>COUNTRY</label><div className="select-wrap country-wrap"><span className="country-flag">{selectedCountry.flag}</span><select aria-label="Destination country" value={country} onChange={e=>changeCountry(e.target.value)}>{COUNTRIES.map(c=><option value={c.code} key={c.code}>{c.name}</option>)}</select><ChevronDown size={16}/></div></div><div className="control-group"><label>LANGUAGE</label><div className="select-wrap"><Languages size={16}/><select aria-label="Destination language" value={actualTarget} onChange={e=>changeLanguage(e.target.value)}>{selectedCountry.languages.map(l=><option value={l.code} key={l.code}>{l.name}</option>)}</select><ChevronDown size={16}/></div></div></div>
              <div className="output-box"><div className="output-content">{busy?<div className="loading-content"><LoaderCircle size={23} className="spin"/><p>Localizing your message…</p></div>:localized?<p lang={shortLang(actualTarget)}>{localized}</p>:<div className="empty-state"><span className="empty-icon green-empty"><Globe2 size={26}/></span><strong>Local translation</strong><small>Choose a country and bring your words to life.</small></div>}</div></div>
              <div className="card-bottom"><div className="input-actions"><button className="square-button" onClick={()=>copy(localized,'Localized translation')} disabled={!localized} title="Copy translation" aria-label="Copy localized"><Copy size={17}/></button><button className="square-button" onClick={()=>speak(localized,actualTarget)} disabled={!localized} title="Listen" aria-label="Speak localized"><Volume2 size={17}/></button><button className="square-button" onClick={download} disabled={!localized} title="Download text" aria-label="Download"><Download size={17}/></button></div><span className="target-tag"><span/> {selectedLanguage.nativeName}</span></div>
            </article>
          </div>
          <div className="workspace-footer">
            <div className="translation-status" role="status" aria-live="polite">{error?<span className="status-error"><WifiOff size={16}/> {error}</span>:busy?<span className="status-pending"><LoaderCircle size={16} className="spin"/> Translating automatically…</span>:localized?<span className="status-success"><Check size={16}/> Translation ready · {toneNote||'Direct translation'}</span>:canTranslate?<span className="status-pending">Waiting for typing to pause…</span>:<span className="status-pending">Type in any language. We’ll understand the meaning first.</span>}</div>
          </div>
        </section>
      </main>
      {toast&&<div className="toast" role="status"><Check size={17}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
      {historyOpen&&<div className="modal-layer" onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryOpen(false);}}><div className="side-panel" role="dialog" aria-modal="true" aria-label="Translation history"><div className="panel-head"><div><span className="section-label">SAVED IN YOUR BROWSER</span><h2>Recent translations</h2></div><button className="square-button" onClick={()=>setHistoryOpen(false)} aria-label="Close"><X size={21}/></button></div>{history.length===0?<div className="history-empty"><History size={32}/><h3>Nothing here yet</h3><p>Your successful translations will appear here on this device.</p></div>:<div className="history-list">{history.map(h=><button key={h.id} className="history-item" onClick={()=>restore(h)}><div className="history-item-top"><span><Clock3 size={13}/> {timeAgo(h.time)}</span><span>{h.targetName} <ArrowRight size={14}/></span></div><strong>{h.text}</strong><p>{h.output}</p></button>)}</div>}<div className="panel-foot"><span>Stored locally · up to 25 items</span><button disabled={!history.length} onClick={()=>{setHistory([]);notify('History cleared');}}><Trash2 size={15}/> Clear history</button></div></div></div>}
      {showInfo&&<div className="modal-layer center-modal-layer" onMouseDown={e=>{if(e.target===e.currentTarget)setShowInfo(false);}}><div className="info-modal" role="dialog" aria-modal="true" aria-label="How translation works"><div className="panel-head"><div><span className="section-label">GOOD TO KNOW</span><h2>How native sync works</h2></div><button className="square-button" onClick={()=>setShowInfo(false)} aria-label="Close"><X size={21}/></button></div><div className="info-body"><div className="info-point"><span>01</span><div><h3>Write naturally in any language</h3><p>Type in any script or combine several languages in one sentence. The AI model infers languages and meaning automatically, including Romanized spoken languages.</p></div></div><div className="info-point"><span>02</span><div><h3>First: clear, grammatically correct English</h3><p>We interpret the intended meaning and rewrite it in natural English. Formal, casual and email writing styles can adjust the tone without inventing facts.</p></div></div><div className="info-point"><span>03</span><div><h3>Then: your selected destination language</h3><p>The chosen native language is translated from the corrected English, never straight from the raw input. Translation starts automatically after you pause typing.</p></div></div><div className="info-warning"><ShieldCheck size={20}/><div><strong>AI-assisted translation. Verify important text.</strong><p>The input is sent to GroqCloud Free AI for translation, not to Gemini or Vercel AI Gateway. Free plan rate limits apply; translation can be inaccurate. Avoid sensitive information. Recent translation history stays in your browser.</p></div></div></div><div className="info-bottom"><a href="https://console.groq.com/docs/overview" target="_blank" rel="noreferrer">About Groq Free AI <MoveUpRight size={15}/></a><button className="primary-button" onClick={()=>setShowInfo(false)}>Got it <Check size={16}/></button></div></div></div>}
    </div>
  );
}
