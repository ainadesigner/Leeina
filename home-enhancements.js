(function(){
'use strict';
const KEY='sb_publishable_GF2VPswgkkieqYs1SCj1Hg_Fmxz0dPj';
const API='/supa';
let rows=[],byId=new Map(),observer=null,timer=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function pick(o,...ks){for(const k of ks)if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];return ''}
function idOf(x){return String(pick(x,'id','source_url'))}
function deadlineValue(x){const v=pick(x,'deadline_at','deadline','end_date');if(!v)return Number.MAX_SAFE_INTEGER;const t=new Date(v).getTime();return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER}
function createdValue(x){const t=new Date(pick(x,'created_at','updated_at')||0).getTime();return Number.isFinite(t)?t:0}
function recommendationValue(x){const n=Number(x&&x.recommendation_score);return Number.isFinite(n)?n:0}
function num(v){const n=Number(String(v||'').replace(/,/g,''));return Number.isFinite(n)?n:0}
function prizeScore(x){
  const text=String(pick(x,'prize','benefit')||'');
  if(!text||/정보 없음|미공개|현금상금.*없|cash prize.*not/i.test(text))return 0;
  let best=0,m;
  const test=(re,mult)=>{re.lastIndex=0;while((m=re.exec(text))){const a=num(m[1]),b=num(m[2]);best=Math.max(best,(b||a)*mult)}};
  test(/(?:US\$|USD\s*|\$)\s*([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?/gi,1400);
  test(/(?:€|EUR\s*)\s*([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?/gi,1600);
  test(/(?:£|GBP\s*)\s*([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?/gi,1900);
  test(/([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?\s*만\s*엔/g,10000*10);
  test(/([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?\s*억\s*원/g,100000000);
  test(/([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?\s*만\s*원/g,10000);
  test(/([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?\s*(?:JPY|엔)/gi,10);
  test(/([\d,.]+)(?:\s*[–—-]\s*([\d,.]+))?\s*(?:KRW|원)/gi,1);
  return best;
}
function isOpen(x){const v=deadlineValue(x);return v===Number.MAX_SAFE_INTEGER||v>=Date.now()-86400000}
function cardFor(id){return $$('#all .card').find(el=>el.dataset.id===String(id))||null}
function triggerOriginal(id,save){const original=cardFor(id);if(!original)return;if(save){const b=original.querySelector('[data-save]');if(b)b.click();return}original.click()}
function renderGlobal(){
  const grid=$('#globalGrid');
  if(!grid||!rows.length)return;
  const selected=rows.filter(x=>x.is_global===true&&isOpen(x)).sort((a,b)=>recommendationValue(b)-recommendationValue(a)||deadlineValue(a)-deadlineValue(b)).slice(0,4);
  const clones=[];
  selected.forEach(x=>{const original=cardFor(idOf(x));if(!original)return;const c=original.cloneNode(true);c.onclick=e=>{if(e.target.closest('[data-save]'))return;triggerOriginal(idOf(x),false)};const save=c.querySelector('[data-save]');if(save)save.onclick=e=>{e.stopPropagation();triggerOriginal(idOf(x),true)};clones.push(c)});
  if(clones.length){grid.replaceChildren(...clones)}else if(!grid.children.length){grid.innerHTML='<div class="empty"><b>Global 기회를 불러오는 중입니다.</b>잠시만 기다려 주세요.</div>'}
}
function compareFor(mode){
  if(mode==='deadline')return (a,b)=>deadlineValue(byId.get(a.dataset.id))-deadlineValue(byId.get(b.dataset.id));
  if(mode==='newest')return (a,b)=>createdValue(byId.get(b.dataset.id))-createdValue(byId.get(a.dataset.id));
  if(mode==='prize')return (a,b)=>prizeScore(byId.get(b.dataset.id))-prizeScore(byId.get(a.dataset.id))||deadlineValue(byId.get(a.dataset.id))-deadlineValue(byId.get(b.dataset.id));
  return null;
}
function observe(){const all=$('#all');if(!all)return;if(!observer)observer=new MutationObserver(()=>schedule());observer.observe(all,{childList:true})}
function applySort(){
  const all=$('#all'),select=$('#sortFilter');
  if(!all||!select)return;
  const cmp=compareFor(select.value);
  if(!cmp){renderGlobal();return}
  if(observer)observer.disconnect();
  const cards=$$('#all .card').sort(cmp);
  cards.forEach(c=>all.appendChild(c));
  observe();
  renderGlobal();
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{applySort();renderGlobal()},30)}
async function loadRows(){
  try{
    const r=await fetch(API+'/rest/v1/contests?status=eq.live&select=id,source_url,is_global,deadline,deadline_at,created_at,updated_at,prize,benefit,recommendation_score&limit=500',{headers:{apikey:KEY}});
    if(!r.ok)throw new Error('enhancement DB '+r.status);
    rows=await r.json();byId=new Map(rows.map(x=>[idOf(x),x]));schedule();
  }catch(e){console.warn('home enhancements',e)}
}
function init(){
  const sort=$('#sortFilter');if(sort)sort.addEventListener('change',applySort);
  observe();loadRows();schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();