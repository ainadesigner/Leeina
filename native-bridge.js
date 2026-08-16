(function(){
'use strict';

const WEB_ORIGIN='https://ai-contest-hub-v12.vercel.app';
const SUPABASE_ORIGIN='https://pkfaaezbwnkgjfgpovzo.supabase.co';

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

window.fetch=function(input,init){
  if(typeof input==='string'||input instanceof URL){
    return originalFetch(rewriteUrl(input),init);
  }
  if(input instanceof Request){
    return originalFetch(new Request(rewriteUrl(input.url),input),init);
  }
  return originalFetch(input,init);
};

window.AI_CONTEST_HUB_NATIVE=true;
window.AI_CONTEST_HUB_WEB_ORIGIN=WEB_ORIGIN;
window.AI_CONTEST_HUB_SUPABASE_ORIGIN=SUPABASE_ORIGIN;
})();
