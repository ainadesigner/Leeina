(function(){
'use strict';

const WEB_ORIGIN='https://ai-contest-hub-v12.vercel.app';
const SUPABASE_ORIGIN='https://pkfaaezbwnkgjfgpovzo.supabase.co';
const isNative=/^(capacitor:|ionic:|file:)/i.test(location.protocol);
if(!isNative)return;

const originalFetch=window.fetch.bind(window);

function rewriteUrl(raw){
  let url=String(raw||'');

  // Native apps call Supabase directly. The web app continues to use Vercel's
  // same-origin /supa proxy, so production web behavior is unchanged.
  if(url.startsWith('/supa')) url=SUPABASE_ORIGIN+url.slice('/supa'.length);
  if(url.startsWith('capacitor://localhost/supa')) url=SUPABASE_ORIGIN+url.slice('capacitor://localhost/supa'.length);
  if(url.startsWith('ionic://localhost/supa')) url=SUPABASE_ORIGIN+url.slice('ionic://localhost/supa'.length);

  try{
    const parsed=new URL(url,WEB_ORIGIN);
    if((parsed.pathname.includes('/auth/v1/signup')||parsed.pathname.includes('/auth/v1/recover'))&&parsed.searchParams.has('redirect_to')){
      const redirect=parsed.searchParams.get('redirect_to')||'';
      if(/^(capacitor:|ionic:|file:)/i.test(redirect)){
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
