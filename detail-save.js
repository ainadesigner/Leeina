(function(){
'use strict';
let activeId='';
const STORAGE_KEY='aich_saved';
function savedSet(){
  try{return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]').map(String))}catch(_){return new Set()}
}
function isSaved(id){return savedSet().has(String(id))}
function paint(btn,id){
  const on=isSaved(id);
  btn.classList.toggle('on',on);
  btn.textContent=on?'♥':'♡';
  btn.setAttribute('aria-label',on?'저장 취소':'이 기회 저장');
  btn.setAttribute('aria-pressed',on?'true':'false');
}
function cardSaveButton(id){
  return [...document.querySelectorAll('[data-save]')].find(b=>String(b.dataset.save)===String(id))||null;
}
async function fallbackToggle(id){
  const set=savedSet(),key=String(id),adding=!set.has(key);
  adding?set.add(key):set.delete(key);
  localStorage.setItem(STORAGE_KEY,JSON.stringify([...set]));
  try{
    const session=window.AICHSession;
    if(!session?.ensure||!session?.request||!await session.ensure())return;
    const ur=await session.request('/auth/v1/user');
    if(!ur.ok)return;
    const user=await ur.json();
    if(!user?.id)return;
    if(adding){
      await session.request('/rest/v1/saved_contests?on_conflict=user_id,contest_id',{
        method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:user.id,contest_id:key})
      });
    }else{
      await session.request('/rest/v1/saved_contests?user_id=eq.'+encodeURIComponent(user.id)+'&contest_id=eq.'+encodeURIComponent(key),{method:'DELETE'});
    }
  }catch(e){console.warn('detail save sync',e)}
}
function injectHeart(){
  if(!activeId)return;
  const body=document.getElementById('detailBody');
  if(!body)return;
  const title=body.querySelector('.detailTitle');
  if(!title)return;
  let wrap=title.parentElement?.classList.contains('detailTitleWrap')?title.parentElement:null;
  if(!wrap){
    wrap=document.createElement('div');
    wrap.className='detailTitleWrap';
    title.before(wrap);
    wrap.appendChild(title);
  }
  let btn=wrap.querySelector('.detailSaveHeart');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='detailSaveHeart';
    wrap.appendChild(btn);
    btn.addEventListener('click',async e=>{
      e.preventDefault();
      e.stopPropagation();
      const id=btn.dataset.saveId||activeId;
      const source=cardSaveButton(id);
      if(source){
        source.click();
      }else{
        await fallbackToggle(id);
      }
      setTimeout(()=>paint(btn,id),0);
    });
  }
  btn.dataset.saveId=activeId;
  paint(btn,activeId);
}
function addStyles(){
  if(document.getElementById('detailSaveStyles'))return;
  const style=document.createElement('style');
  style.id='detailSaveStyles';
  style.textContent='.detailTitleWrap{display:grid;grid-template-columns:minmax(0,1fr) 48px;align-items:end;gap:12px;margin:.83em 0}.detailTitleWrap .detailTitle{margin:0}.detailSaveHeart{width:46px;height:46px;border-radius:50%;border:1px solid var(--line);background:#09271f;color:#fff;font-size:28px;line-height:1;display:grid;place-items:center;cursor:pointer;transition:transform .15s ease,color .15s ease,border-color .15s ease}.detailSaveHeart:active{transform:scale(.94)}.detailSaveHeart.on{color:var(--pink);border-color:rgba(255,90,165,.55)}';
  document.head.appendChild(style);
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-save]'))return;
  const card=e.target.closest('.card[data-id]');
  if(card)activeId=String(card.dataset.id||'');
},true);
const body=document.getElementById('detailBody');
if(body)new MutationObserver(injectHeart).observe(body,{childList:true,subtree:false});
const modal=document.getElementById('detailModal');
if(modal)new MutationObserver(()=>{if(modal.classList.contains('open'))injectHeart()}).observe(modal,{attributes:true,attributeFilter:['class']});
addStyles();
})();
