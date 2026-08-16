import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../native-bridge.js',import.meta.url),'utf8');
const SUPABASE='https://pkfaaezbwnkgjfgpovzo.supabase.co';
const WEB='https://ai-contest-hub-v12.vercel.app';

class MockRequest{
  constructor(input,init={}){
    this.url=typeof input==='string'?input:input.url;
    this.method=init.method||(input&&input.method)||'GET';
    this.headers=init.headers||(input&&input.headers)||{};
    this.body=init.body||(input&&input.body);
  }
}

function boot(locationHref,{capacitor=false}={}){
  const calls=[];
  const location=new URL(locationHref);
  const window={
    fetch:async(...args)=>{
      calls.push(args);
      return {ok:true,status:200};
    }
  };

  if(capacitor){
    window.Capacitor={isNativePlatform:()=>true};
  }

  const context={
    window,
    location,
    URL,
    Request:MockRequest,
    console
  };
  vm.runInNewContext(source,context,{filename:'native-bridge.js'});
  return {window,calls};
}

{
  const {window,calls}=boot('https://localhost/');
  assert.equal(window.AI_CONTEST_HUB_NATIVE,true,'https://localhost must be recognized as native');
  await window.fetch('/supa/rest/v1/contests?status=eq.live');
  assert.equal(
    calls[0][0],
    `${SUPABASE}/rest/v1/contests?status=eq.live`,
    'relative /supa calls must go directly to Supabase'
  );
}

{
  const {window,calls}=boot('https://localhost/');
  const request=new MockRequest('https://localhost/supa/auth/v1/user',{method:'GET'});
  await window.fetch(request);
  assert.equal(calls[0][0].url,`${SUPABASE}/auth/v1/user`,'Request objects must also be rewritten');
}

{
  const {window,calls}=boot('https://localhost/');
  const signup=`/supa/auth/v1/signup?redirect_to=${encodeURIComponent('https://localhost/')}`;
  await window.fetch(signup);
  const rewritten=new URL(calls[0][0]);
  assert.equal(rewritten.origin,SUPABASE);
  assert.equal(rewritten.searchParams.get('redirect_to'),`${WEB}/`,'native signup redirects must return to the web recovery target');
}

{
  const {window,calls}=boot('https://localhost/');
  const recovery=`/supa/auth/v1/recover?redirect_to=${encodeURIComponent('https://localhost/?password_recovery=1')}`;
  await window.fetch(recovery);
  const rewritten=new URL(calls[0][0]);
  assert.equal(rewritten.searchParams.get('redirect_to'),`${WEB}/?password_recovery=1`);
}

{
  const {window,calls}=boot('https://ai-contest-hub-v12.vercel.app/');
  assert.equal(window.AI_CONTEST_HUB_NATIVE,undefined,'production web origin must remain untouched');
  await window.fetch('/supa/rest/v1/contests');
  assert.equal(calls[0][0],'/supa/rest/v1/contests');
}

{
  const {window,calls}=boot('https://example.invalid/',{capacitor:true});
  assert.equal(window.AI_CONTEST_HUB_NATIVE,true,'Capacitor native detection must work even with a custom scheme/host');
  await window.fetch('/supa/rest/v1/contests');
  assert.equal(calls[0][0],`${SUPABASE}/rest/v1/contests`);
}

console.log('Native bridge regression tests passed.');
