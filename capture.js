#!/usr/bin/env node
// Save to Cauldron: run AFTER node build.js
const fs = require('fs');
const path = require('path');
const { createPlaceholder } = require('./src/placeholder.js');
const out = path.join(__dirname, 'dist');

if (!fs.existsSync(path.join(out, 'index.html'))) {
  throw Error('Run node build.js first');
}

const config = {
  url: (process.env.CAULDRON_SUPABASE_URL || '').trim(),
  key: (process.env.CAULDRON_SUPABASE_PUBLISHABLE_KEY || '').trim()
};

if (!!config.url !== !!config.key) {
  throw Error('Set both Supabase values or neither');
}
if (
  config.url &&
  !/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(config.url)
) {
  throw Error('Invalid Supabase URL');
}
config.url = config.url.replace(/\/$/, '');

fs.writeFileSync(
  path.join(out, 'cauldron.webmanifest'),
  JSON.stringify({
    id: '/inbox/',
    name: "Save to Kayy's Cauldron",
    short_name: 'Cauldron',
    start_url: '/inbox/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0a09',
    theme_color: '#0b0a09',
    icons: [192, 512].map(n => ({
      src: '/cauldron-' + n + '.png',
      sizes: n + 'x' + n,
      type: 'image/png'
    })),
    share_target: {
      action: '/inbox/',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url'
      }
    }
  }, null, 2)
);

for (const n of [192, 512]) {
  fs.writeFileSync(
    path.join(out, 'cauldron-' + n + '.png'),
    createPlaceholder(n, n)
  );
}

fs.writeFileSync(
  path.join(out, 'cauldron-sw.js'),
  `const CACHE='cauldron-inbox-cache-v1';
self.addEventListener('install',e=>e.waitUntil((async()=>{
  try{
    const c=await caches.open(CACHE);
    await c.add('/inbox/');
  }catch(e){}
  await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.method==='GET'&&new URL(e.request.url).pathname==='/inbox/'){
    e.respondWith(
      fetch(e.request).catch(()=>caches.match('/inbox/'))
    );
  }
});`
);

const html = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b0a09">
<title>Saved for Later — Kayy's Cauldron</title>
<link rel="manifest" href="/cauldron.webmanifest">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
*{box-sizing:border-box}
body{margin:0;background:#0b0a09;color:#f5e6d8;font:16px/1.45 system-ui,sans-serif}
header{padding:16px;border-bottom:1px solid #47332c;display:flex;justify-content:space-between;align-items:center;gap:10px}
a{color:#ffb685}
header a{text-decoration:none;font-weight:bold}
header b{color:#fa7253}
main{max-width:680px;margin:auto;padding:20px 16px 60px}
h1{margin:10px 0;font-size:2rem}
p{color:#bdab9f}
section{background:#18120f;border:1px solid #453028;border-radius:12px;padding:16px;margin:18px 0}
label{display:block;margin:12px 0 6px;font-weight:600;font-size:.88rem}
input{width:100%;padding:12px;border-radius:8px;background:#241c18;color:white;border:1px solid #655048;font:inherit}
button{min-height:42px;margin:12px 8px 0 0;border:0;border-radius:8px;padding:9px 15px;background:#b73225;color:#fff;font:inherit;cursor:pointer}
button.secondary{background:#35241d}
button:focus-visible,input:focus-visible{outline:2px solid #ffb685;outline-offset:2px}
#notice{color:#ffe0ab;background:#423021;border:1px solid #85613b;padding:12px;border-radius:9px}
[hidden]{display:none!important}
.item{border-top:1px solid #453028;padding:15px 0;overflow-wrap:anywhere}
.item a{font-weight:650}
.small{font-size:.85rem}
.muted{color:#ad9e92}
.item button{font-size:.83rem;min-height:36px}
</style>
</head>
<body>
<header>
<a href="/">KAYY'S <b>CAULDRON</b></a>
<a href="/">Recipes</a>
</header>
<main>
<h1>Saved for Later 🖤</h1>
<p>See it → Share it → Saved. Sort it out later.</p>
<p id="notice" role="status" hidden></p>

<section>
<strong>Save a link</strong>
<form id="form">
<label for="url">Recipe link</label>
<input id="url" type="url" inputmode="url" required placeholder="https://...">
<label for="title">Name (optional)</label>
<input id="title" placeholder="I'll figure it out later">
<button type="submit">Save to Cauldron</button>
</form>
<p class="small">Install this page from Chrome's menu to add Cauldron to Android's Share menu.</p>
</section>

<section>
<strong>Private cloud backup</strong>
<p id="status" class="small">Checking...</p>
<form id="login" hidden>
<label for="email">Email</label>
<input id="email" type="email" required placeholder="you@example.com">
<button type="submit">Email sign-in link</button>
</form>
<button id="signout" class="secondary" hidden>Sign out</button>
</section>

<h2>Saved links (<span id="count">0</span>)</h2>
<div id="items"></div>
<p class="small">Without cloud sign-in, saved links exist only in this browser and could be lost. Saving a link does not copy its recipe text or photos.</p>
</main>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
'use strict';
const cfg=__CONFIG__, store='kayy-cauldron-links-v2';
const el=id=>document.getElementById(id);
let api=null,user=null,remote=[];

function alertMsg(s){
  el('notice').textContent=s;
  el('notice').hidden=false;
}

function urlFrom(s){
  const hit=String(s||'').match(/https?:\/\/[^\s<>"']+/);
  if(!hit)return '';
  try{
    const u=new URL(hit[0].replace(/[),.!?;]+$/,''));
    return ['http:','https:'].includes(u.protocol)
      ?u.href.slice(0,2048):'';
  }catch{return ''}
}

function getItems(){
  try{
    return JSON.parse(localStorage.getItem(store)||'[]');
  }catch{return []}
}

function setItems(items){
  localStorage.setItem(store,JSON.stringify(items));
}

function localSave(link,title){
  const rows=getItems();
  if(rows.some(x=>x.url===link))return false;
  rows.push({
    url:link,
    title:(title||new URL(link).hostname).slice(0,200),
    created_at:new Date().toISOString(),
    synced:false
  });
  setItems(rows);
  return true;
}

async function list(){
  const map=new Map(remote.map(x=>[x.url,x]));
  getItems().forEach(x=>map.set(x.url,x));
  const rows=[...map.values()].sort(
    (a,b)=>b.created_at.localeCompare(a.created_at)
  );
  el('count').textContent=rows.length;
  el('items').replaceChildren();

  if(!rows.length){
    const p=document.createElement('p');
    p.textContent='Nothing saved yet.';
    el('items').append(p);
    return;
  }

  for(const item of rows){
    const box=document.createElement('div');
    box.className='item';

    const a=document.createElement('a');
    a.textContent=item.title||item.url;
    a.href=item.url;
    a.target='_blank';
    a.rel='noopener noreferrer';
    box.append(a);

    const meta=document.createElement('div');
    meta.className='small muted';
    meta.textContent=new URL(item.url).hostname+
      ' · '+new Date(item.created_at).toLocaleDateString();
    box.append(meta);

    const copy=document.createElement('button');
    copy.textContent='Copy';
    copy.className='secondary';
    copy.onclick=()=>navigator.clipboard.writeText(item.url)
      .then(()=>alertMsg('Copied!'),
            ()=>alertMsg('Unable to copy'));

    const remove=document.createElement('button');
    remove.className='secondary';
    remove.textContent='Remove';
    remove.onclick=()=>deleteLink(item.url);

    box.append(copy,remove);
    el('items').append(box);
  }
}

async function save(link,title){
  const url=urlFrom(link);
  if(!url){
    alertMsg('No link found. Paste the recipe URL.');
    return;
  }
  const fresh=localSave(url,title);
  await list();
  alertMsg(fresh
    ?'Saved to Cauldron!'
    :'Already saved — no duplicate.');
  if(user)await sync();
}

async function deleteLink(link){
  if(!confirm('Remove this saved link?'))return;
  try{
    if(api&&user){
      const r=await api.from('saved_links')
        .delete()
        .eq('user_id',user.id)
        .eq('url',link);
      if(r.error)throw r.error;
      remote=remote.filter(x=>x.url!==link);
    }
    setItems(getItems().filter(x=>x.url!==link));
    await list();
  }catch(e){
    alertMsg('Could not remove: '+e.message);
  }
}

async function sync(){
  if(!api||!user)return;
  try{
    const rows=getItems();
    for(const x of rows.filter(x=>!x.synced)){
      const r=await api.from('saved_links').upsert({
        user_id:user.id,
        url:x.url,
        title:x.title,
        source:new URL(x.url).hostname,
        created_at:x.created_at
      },{
        onConflict:'user_id,url',
        ignoreDuplicates:true
      });
      if(r.error)throw r.error;
      x.synced=true;
    }
    setItems(rows);

    const r=await api.from('saved_links')
      .select('url,title,created_at')
      .order('created_at',{ascending:false})
      .limit(1000);

    if(r.error)throw r.error;
    remote=r.data||[];
    el('status').textContent=
      'Signed in as '+user.email+'. Cloud backup connected.';
    await list();
  }catch(e){
    el('status').textContent='Backup error: '+e.message;
  }
}

function showAuth(){
  el('login').hidden=!api||!!user;
  el('signout').hidden=!user;
  if(!api){
    el('status').textContent=
      'Not configured. Links stay on this phone only.';
  }else if(!user){
    el('status').textContent=
      'Sign in to back up your links privately.';
  }
}

async function initCloud(){
  if(!cfg.url||!cfg.key||!window.supabase){
    showAuth();
    return;
  }
  api=window.supabase.createClient(cfg.url,cfg.key);
  const r=await api.auth.getSession();
  user=r.data.session?.user||null;
  showAuth();
  if(user)await sync();

  api.auth.onAuthStateChange((_event,s)=>{
    user=s?.user||null;
    showAuth();
    if(user)setTimeout(sync,0);
    else{
      remote=[];
      list();
    }
  });
}

el('form').onsubmit=async e=>{
  e.preventDefault();
  await save(el('url').value,el('title').value);
  e.target.reset();
};

el('login').onsubmit=async e=>{
  e.preventDefault();
  if(!api)return;
  const r=await api.auth.signInWithOtp({
    email:el('email').value.trim(),
    options:{
      emailRedirectTo:location.origin+'/inbox/'
    }
  });
  alertMsg(r.error
    ?'Sign-in error: '+r.error.message
    :'Check your email for a sign-in link.');
};

el('signout').onclick=async()=>{
  if(api)await api.auth.signOut();
  user=null;
  remote=[];
  showAuth();
  await list();
};

(async()=>{
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register(
      '/cauldron-sw.js',{scope:'/'}
    ).catch(()=>{});
  }

  const p=new URLSearchParams(location.search);
  const link=urlFrom(p.get('url'))||urlFrom(p.get('text'));

  if(link){
    await save(link,p.get('title')||'');
  }else if(p.has('url')||p.has('text')){
    alertMsg('That app did not share a readable link. Try Copy Link and paste it.');
  }

  if(p.toString()){
    history.replaceState(null,'','/inbox/');
  }

  await list();
  await initCloud();
})();
</script>
</body>
</html>`;

fs.mkdirSync(path.join(out, 'inbox'), {
  recursive:true
});

fs.writeFileSync(
  path.join(out, 'inbox','index.html'),
  html.replace('__CONFIG__',JSON.stringify(config))
);

for (
  const rel of [
    'index.html',
    ...fs.readdirSync(path.join(out,'r'))
      .filter(n=>n.endsWith('.html'))
      .map(n=>'r/'+n)
  ]
){
  const file=path.join(out,rel);
  let doc=fs.readFileSync(file,'utf8');

  doc=doc.replace(
    '</head>',
    '<link rel="manifest" href="/cauldron.webmanifest">\n</head>'
  );

  if(rel==='index.html'){
    doc=doc.replace(
      '<div class="tools">',
      '<p style="margin:16px 0"><a href="/inbox/" style="color:#ffb685;font-weight:700">🖤 Saved for Later · Private Inbox</a></p>\n<div class="tools">'
    );
  }

  fs.writeFileSync(file,doc);
}

console.log('Save to Cauldron ready at /inbox/');
