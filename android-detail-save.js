(function(){
'use strict';
// AICH_ANDROID_DETAIL_SAVE_V1
function savedIds(){
  try{return new Set(JSON.parse(localStorage.getItem('aich_saved')||'[]').map(String))}catch(_){return new Set()}
}
function findCardSave(id){
  return [...document.querySelectorAll('[data-save]')].find(el=>String(el.dataset.save)===String(id))||null;
}
function syncButton(button,id){
  const on=savedIds().has(String(id));
  button.classList.toggle('on',on);
  button.textContent=on?'♥':'♡';
  button.setAttribute('aria-label',on?'저장 취소':'관심 기회 저장');
  button.setAttribute('title',on?'저장 취소':'관심 기회 저장');
}
function mountDetailSave(id){
  const body=document.getElementById('detailBody');
  if(!body)return;
  const title=body.querySelector('.detailTitle');
  if(!title)return;
  const old=body.querySelector('.detailSave');
  if(old)old.remove();
  let row=title.parentElement;
  if(!row||!row.classList.contains('detailTitleActionRow')){
    row=document.createElement('div');
    row.className='detailTitleActionRow';
    title.parentNode.insertBefore(row,title);
    row.appendChild(title);
  }
  const button=document.createElement('button');
  button.type='button';
  button.className='detailSave';
  button.dataset.detailSave=String(id);
  syncButton(button,id);
  button.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    const cardSave=findCardSave(id);
    if(cardSave){
      cardSave.click();
      setTimeout(()=>syncButton(button,id),0);
      return;
    }
    const set=savedIds();
    set.has(String(id))?set.delete(String(id)):set.add(String(id));
    localStorage.setItem('aich_saved',JSON.stringify([...set]));
    syncButton(button,id);
  });
  row.appendChild(button);
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-save]'))return;
  const card=e.target.closest('.card');
  if(!card||!card.dataset.id)return;
  const id=card.dataset.id;
  setTimeout(()=>mountDetailSave(id),0);
});
})();
