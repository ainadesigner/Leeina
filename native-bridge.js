(function(){
'use strict';

const WEB_ORIGIN='https://ai-contest-hub-v12.vercel.app';
const SUPABASE_ORIGIN='https://pkfaaezbwnkgjfgpovzo.supabase.co';
// Supabase's legacy anon key is intentionally public and protected by RLS.
// Android WebView requests use it for both apikey and the anonymous Bearer
// token because this combination is consistently accepted by PostgREST.
const LEGACY_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrZmFhZXpid25rZ2pmZ3BvdnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDEyNTMsImV4cCI6MjEwMjI3NzI1M30.4qJShAy-7i_9g2jD3AXmK49QBOlrA4lSCuEy92nTjXQ';

function isNativeLocalUrl(value){
  try{
    const parsed=new URL(String(value||''),location.href);
    return /^(capacitor:|ionic:|file:)/i.test(parsed.protocol)||/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
  }catch(_){
    return false;
  }
}

const capacitorNative=Boolean(
  window.Capacitor&&
  typeof window.Capacitor.isNativePlatform==='function'&&
  window.Capacitor.isNativePlatform()
);
const isNative=capacitorNative||isNativeLocalUrl(location.href);
if(!isNative)return;

const originalFetch=window.fetch.bind(window);

function rewriteUrl(raw){
  let url=String(raw||'');

  // Capacitor serves bundled web files from a local origin such as
  // https://localhost. Convert the web-only /supa proxy path to the real
  // Supabase origin inside native apps. The production web app is unchanged.
  if(url.startsWith('/supa')){
    url=SUPABASE_ORIGIN+url.slice('/supa'.length);
  }else{
    try{
      const local=new URL(url,location.href);
      if(isNativeLocalUrl(local.toString())&&local.pathname.startsWith('/supa')){
        url=SUPABASE_ORIGIN+local.pathname.slice('/supa'.length)+local.search+local.hash;
      }
    }catch(_){
      // Leave malformed values untouched so fetch can surface its own error.
    }
  }

  try{
    const parsed=new URL(url,WEB_ORIGIN);
    const isAuthRedirectRequest=
      parsed.pathname.includes('/auth/v1/signup')||
      parsed.pathname.includes('/auth/v1/recover');

    if(isAuthRedirectRequest&&parsed.searchParams.has('redirect_to')){
      const redirect=parsed.searchParams.get('redirect_to')||'';
      if(isNativeLocalUrl(redirect)){
        const recovery=redirect.includes('password_recovery=1');
        parsed.searchParams.set('redirect_to',WEB_ORIGIN+'/' +(recovery?'?password_recovery=1':''));
      }
    }
    return parsed.toString();
  }catch(_){
    return url;
  }
}

function isSupabaseUrl(value){
  try{
    return new URL(String(value||''),location.href).origin===SUPABASE_ORIGIN;
  }catch(_){
    return false;
  }
}

function authenticatedHeaders(url,sourceHeaders){
  const headers=new Headers(sourceHeaders||{});
  if(!isSupabaseUrl(url))return headers;

  // Always identify the public Android client with the active legacy anon key.
  // If app.js supplied a signed-in user's JWT, preserve it. Otherwise provide
  // the anon JWT so PostgREST receives a valid Authorization header.
  headers.set('apikey',LEGACY_ANON_KEY);
  const existingAuthorization=headers.get('Authorization')||'';
  if(!existingAuthorization||/^Bearer\s+sb_publishable_/i.test(existingAuthorization)){
    headers.set('Authorization','Bearer '+LEGACY_ANON_KEY);
  }
  return headers;
}

window.fetch=function(input,init){
  if(typeof input==='string'||input instanceof URL){
    const url=rewriteUrl(input);
    const nextInit=Object.assign({},init||{});
    nextInit.headers=authenticatedHeaders(url,nextInit.headers);
    return originalFetch(url,nextInit);
  }

  if(input instanceof Request){
    const url=rewriteUrl(input.url);
    const rewritten=new Request(url,input);
    const merged=init?new Request(rewritten,init):rewritten;
    const headers=authenticatedHeaders(url,merged.headers);
    return originalFetch(new Request(merged,{headers}));
  }

  return originalFetch(input,init);
};

window.AI_CONTEST_HUB_NATIVE=true;
window.AI_CONTEST_HUB_WEB_ORIGIN=WEB_ORIGIN;
window.AI_CONTEST_HUB_SUPABASE_ORIGIN=SUPABASE_ORIGIN;
})();
