(function(){
'use strict';
const KEY='sb_publishable_GF2VPswgkkieqYs1SCj1Hg_Fmxz0dPj';
const API='/supa';
const hash=new URLSearchParams(location.hash.replace(/^#/,''));
const type=hash.get('type');
const accessToken=hash.get('access_token');
if(type!=='recovery'||!accessToken)return;

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

const wrap=document.createElement('div');
wrap.id='recoveryOverlay';
wrap.innerHTML=`<div class="recoverySheet" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle">
  <div class="recoveryIcon">🔐</div>
  <small>ACCOUNT RECOVERY</small>
  <h2 id="recoveryTitle">새 비밀번호 설정</h2>
  <p>사용할 새 비밀번호를 입력해 주세요.</p>
  <input class="input" id="recoveryPw" type="password" autocomplete="new-password" minlength="8" placeholder="새 비밀번호 8자 이상">
  <input class="input" id="recoveryPw2" type="password" autocomplete="new-password" minlength="8" placeholder="새 비밀번호 확인">
  <button class="btn primary full" id="recoverySave">비밀번호 변경</button>
  <p class="msg" id="recoveryMsg"></p>
</div>`;
document.body.appendChild(wrap);

const style=document.createElement('style');
style.textContent=`#recoveryOverlay{position:fixed;inset:0;z-index:9999;background:rgba(2,12,9,.88);backdrop-filter:blur(10px);display:grid;place-items:center;padding:22px}.recoverySheet{width:min(100%,430px);background:#0c211b;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:26px;box-shadow:0 24px 80px rgba(0,0,0,.45)}.recoverySheet .recoveryIcon{font-size:38px;margin-bottom:10px}.recoverySheet small{color:#fa4f9a;font-weight:800;letter-spacing:.12em}.recoverySheet h2{margin:7px 0 8px;color:#fff}.recoverySheet p{color:#a8bdb5;line-height:1.5}.recoverySheet .input{width:100%;box-sizing:border-box;margin-top:10px}.recoverySheet .btn{margin-top:14px}.recoverySheet .msg{min-height:22px;color:#d8e7e1}`;
document.head.appendChild(style);

const pw=document.getElementById('recoveryPw');
const pw2=document.getElementById('recoveryPw2');
const btn=document.getElementById('recoverySave');
const msg=document.getElementById('recoveryMsg');
pw.focus();
btn.onclick=async()=>{
  const value=pw.value;
  if(value.length<8){msg.textContent='비밀번호는 8자 이상 입력해 주세요.';return}
  if(value!==pw2.value){msg.textContent='비밀번호가 서로 일치하지 않습니다.';return}
  btn.disabled=true;msg.textContent='비밀번호를 변경하는 중...';
  try{
    const r=await fetch(API+'/auth/v1/user',{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({password:value})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.msg||d.message||'변경 실패');
    const refresh=hash.get('refresh_token');
    const sessionData={access_token:accessToken,refresh_token:refresh||'',expires_at:Number(hash.get('expires_at')||0),expires_in:Number(hash.get('expires_in')||0)};
    if(window.AICHSession&&typeof window.AICHSession.save==='function')window.AICHSession.save(sessionData,{fresh:true});
    else{localStorage.setItem('aich_access_token',accessToken);if(refresh)localStorage.setItem('aich_refresh_token',refresh);localStorage.setItem('aich_session_started_at',String(Date.now()));localStorage.removeItem('aich_access_expires_at');}
    history.replaceState({},'',location.pathname+location.search.replace(/([?&])password_recovery=1(&|$)/,'$1').replace(/[?&]$/,''));
    msg.textContent='비밀번호가 변경되었습니다. 잠시 후 MY 화면으로 이동합니다.';
    setTimeout(()=>location.reload(),900);
  }catch(e){msg.textContent='비밀번호 변경에 실패했습니다. 재설정 메일을 다시 요청해 주세요.';btn.disabled=false;}
};
})();
