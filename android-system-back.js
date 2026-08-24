(function(){
'use strict';
// AICH_ANDROID_SYSTEM_BACK_V1

let detailModal=null;
let detailHistoryActive=false;
let closingFromHistory=false;

function getDetailModal(){
  if(!detailModal)detailModal=document.getElementById('detailModal');
  return detailModal;
}

function pushDetailHistory(){
  if(detailHistoryActive)return;
  history.pushState(Object.assign({},history.state||{},{aichDetail:true}),'',location.href);
  detailHistoryActive=true;
}

function closeDetailFromBack(){
  const modal=getDetailModal();
  if(modal&&modal.classList.contains('open')){
    closingFromHistory=true;
    modal.classList.remove('open');
    closingFromHistory=false;
  }
  detailHistoryActive=false;
}

window.addEventListener('popstate',()=>{
  const modal=getDetailModal();
  if(modal&&modal.classList.contains('open'))closeDetailFromBack();
  else detailHistoryActive=false;
});

function watchDetailModal(){
  const modal=getDetailModal();
  if(!modal)return;

  const observer=new MutationObserver(()=>{
    const open=modal.classList.contains('open');
    if(open){
      pushDetailHistory();
      return;
    }
    if(detailHistoryActive&&!closingFromHistory){
      detailHistoryActive=false;
      history.back();
    }
  });
  observer.observe(modal,{attributes:true,attributeFilter:['class']});

  if(modal.classList.contains('open'))pushDetailHistory();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchDetailModal,{once:true});
else watchDetailModal();
})();
