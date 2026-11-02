#!/usr/bin/env node
// Kayy's Cauldron — Private Save → One-Tap Publish
// Runs after build.js and capture.js.

'use strict';

const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'dist');

const config = {
  url: (process.env.CAULDRON_SUPABASE_URL || '')
    .trim()
    .replace(/\/$/, ''),
  key: (process.env.CAULDRON_SUPABASE_PUBLISHABLE_KEY || '')
    .trim()
};

if (!config.url || !config.key) {
  throw new Error('Supabase environment variables missing.');
}

const inboxFile = path.join(dist, 'inbox', 'index.html');
const homeFile = path.join(dist, 'index.html');

let inbox = fs.readFileSync(inboxFile, 'utf8');
let home = fs.readFileSync(homeFile, 'utf8');

function replaceOnce(source, find, replacement) {
  if (!source.includes(find)) {
    throw new Error('Could not find: ' + find.slice(0, 60));
  }
  return source.replace(find, replacement);
}

// INBOX STYLING

inbox = replaceOnce(
  inbox,
  '</style>',
  `
.publish-button {
  background: #a63720;
}
.publish-button[disabled] {
  opacity: .6;
}
#publication-hint {
  font-size: .84rem;
  color: #d8b798;
}
</style>`
);

// PRIVATE INBOX MESSAGE

inbox = replaceOnce(
  inbox,
  '<h2>Saved links (<span id="count">0</span>)</h2>',
  `<h2>Saved links (<span id="count">0</span>)</h2>
<p id="publication-hint">
  Private until you tap Publish.
  Published links appear on your public site.
</p>`
);

// TRACK PUBLISHED LINKS

inbox = replaceOnce(
  inbox,
  'let api=null,user=null,remote=[];',
  `let api=null,user=null,remote=[];
const publishedUrls = new Set();
let pubWorking = false;`
);

// PUBLISH BUTTON FOR EACH SAVED LINK

inbox = replaceOnce(
  inbox,
  'box.append(copy,remove);',
  `box.append(copy,remove);

  if (user) {
    const publish = document.createElement('button');
    const isPublished = publishedUrls.has(item.url);

    publish.textContent = isPublished
      ? 'Unpublish'
      : 'Publish';

    publish.className = isPublished
      ? 'secondary'
      : 'publish-button';

    publish.disabled = pubWorking;
    publish.onclick = () => togglePublish(item);

    box.append(publish);
  }`
);

// PUBLISH AND UNPUBLISH FUNCTIONS

inbox = replaceOnce(
  inbox,
  'async function save(link,title){',
  `async function togglePublish(item) {
  if (!api || !user) {
    alertMsg('Sign in before publishing.');
    return;
  }

  if (pubWorking) return;

  pubWorking = true;
  await list();

  const isPublished = publishedUrls.has(item.url);

  try {
    if (isPublished) {
      const r = await api
        .from('published_links')
        .delete()
        .eq('user_id', user.id)
        .eq('url', item.url);

      if (r.error) throw r.error;

      publishedUrls.delete(item.url);

      alertMsg('Unpublished! Removed from public view.');

    } else {
      const r = await api
        .from('published_links')
        .upsert({
          user_id: user.id,
          url: item.url,
          title: (
            item.title || new URL(item.url).hostname
          ).slice(0, 200)
        }, {
          onConflict: 'user_id,url'
        });

      if (r.error) throw r.error;

      publishedUrls.add(item.url);

      alertMsg('Published! Your website will update on refresh.');
    }

  } catch (e) {
    alertMsg('Publishing error: ' + e.message);

  } finally {
    pubWorking = false;
    await list();
  }
}

async function save(link,title){`
);

// UNPUBLISH BEFORE DELETING A SAVED LINK

inbox = replaceOnce(
  inbox,
  `if(api&&user){
      const r=await api.from('saved_links')`,
  `if(api&&user){
      if(publishedUrls.has(link)){
        const p=await api.from('published_links')
          .delete()
          .eq('user_id',user.id)
          .eq('url',link);

        if(p.error)throw p.error;

        publishedUrls.delete(link);
      }

      const r=await api.from('saved_links')`
);

// LOAD PUBLISHING STATUS FROM SUPABASE

inbox = replaceOnce(
  inbox,
  `remote=r.data||[];
    el('status').textContent=`,
  `remote=r.data||[];

    const published=await api
      .from('published_links')
      .select('url')
      .eq('user_id',user.id);

    publishedUrls.clear();

    if(!published.error){
      for(const row of published.data||[]){
        publishedUrls.add(row.url);
      }

      el('publication-hint').textContent=
        'Private until you tap Publish. Tap Unpublish to remove an approved link.';

    }else{
      el('publication-hint').textContent=
        'Publishing is not set up yet: '+published.error.message;
    }

    el('status').textContent=`
);

// CLEAR PUBLICATION STATE ON SIGN-OUT

inbox = replaceOnce(
  inbox,
  `remote=[];
      list();`,
  `remote=[];
      publishedUrls.clear();
      list();`
);

inbox = replaceOnce(
  inbox,
  `user=null;
  remote=[];
  showAuth();`,
  `user=null;
  remote=[];
  publishedUrls.clear();
  showAuth();`
);

// PUBLIC APPROVED FINDS SECTION

const publicSection = `
<section
  id="approved-finds"
  aria-labelledby="approved-title"
  hidden
  style="margin:36px auto 50px;max-width:1100px;padding:0 18px"
>
  <h2 id="approved-title"
      style="font-size:1.6rem;margin:0 0 8px">
    Approved Finds 🖤
  </h2>

  <p style="margin:0 0 22px;color:#c7ac9c">
    Handpicked links from the crypt.
    Open the original post for the recipe.
  </p>

  <div
    id="approved-grid"
    class="grid"
    style="visibility:visible;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px"
  ></div>
</section>`;

home = replaceOnce(
  home,
  '</main>',
  publicSection + '\n</main>'
);

home = replaceOnce(
  home,
  '<script src="/app.js"></script>',
  `<script src="/app.js"></script>
<script defer src="/approved-finds.js"></script>`
);

// LOAD ONLY APPROVED LINKS ON THE PUBLIC WEBSITE

const browserJs = `
(async function(){
  'use strict';

  const cfg=${JSON.stringify(config).replace(/</g, '\\u003c')};

  const section=document.getElementById('approved-finds');
  const grid=document.getElementById('approved-grid');

  if(!section || !grid)return;

  try {
    const endpoint=
      cfg.url+
      '/rest/v1/published_links?select=title,url,published_at&order=published_at.desc&limit=100';

    const r=await fetch(endpoint,{
      headers:{
        apikey:cfg.key,
        Accept:'application/json'
      },
      cache:'no-store'
    });

    if(!r.ok){
      throw Error('Public gallery fetch failed: '+r.status);
    }

    const rows=await r.json();

    if(!Array.isArray(rows) || !rows.length)return;

    for(const item of rows){
      let link;

      try{
        link=new URL(item.url);

        if(
          link.protocol!=='https:' &&
          link.protocol!=='http:'
        )continue;

      }catch{
        continue;
      }

      const card=document.createElement('article');
      card.className='card';
      card.style.setProperty('--c','#ff8a3d');

      const a=document.createElement('a');
      a.className='card-link';
      a.href=link.href;
      a.target='_blank';
      a.rel='noopener noreferrer';

      const shot=document.createElement('span');
      shot.className='shot';

      const img=document.createElement('img');
      img.src='/placeholder.png';
      img.alt='';
      img.loading='lazy';
      img.width=720;
      img.height=900;

      const badge=document.createElement('span');
      badge.className='badge';
      badge.textContent='Approved Find';

      shot.append(img,badge);

      const body=document.createElement('span');
      body.className='card-body';

      const cat=document.createElement('span');
      cat.className='cat';
      cat.textContent=link.hostname.replace(/^www\\./,'');

      const title=document.createElement('span');
      title.className='name';
      title.textContent=item.title||link.hostname;

      body.append(cat,title);
      a.append(shot,body);
      card.append(a);
      grid.append(card);
    }

    section.hidden=!grid.children.length;

  }catch(e){
    console.warn('Approved Finds could not load:',e);
  }

})();
`;

fs.writeFileSync(
  path.join(dist, 'approved-finds.js'),
  browserJs,
  'utf8'
);

fs.writeFileSync(inboxFile, inbox, 'utf8');
fs.writeFileSync(homeFile, home, 'utf8');

console.log(
  'Private publishing controls and public Approved Finds ready.'
);
