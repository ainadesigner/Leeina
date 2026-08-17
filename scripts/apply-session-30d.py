from pathlib import Path

APP = Path("app.js")
INDEX = Path("index.html")

app = APP.read_text(encoding="utf-8")

if "AICH_SESSION_30D_V1" in app:
    print("30-day session persistence is already applied")
else:
    app = app.replace(
        "// AICH_DISCOVERY_SORT_V1",
        "// AICH_DISCOVERY_SORT_V1\n// AICH_SESSION_30D_V1",
        1,
    )

    old_session_core = r"""function token(){return localStorage.getItem('aich_access_token')||''}
function headers(auth=true){const h={'apikey':KEY,'Content-Type':'application/json'};if(auth&&token())h.Authorization='Bearer '+token();return h}
function req(path,opt={}){opt.headers=Object.assign(headers(opt.auth!==false),opt.headers||{});return fetch(API+path,opt)}"""

    new_session_core = r"""const SESSION_MAX_AGE_MS=30*24*60*60*1000;
const SESSION_REFRESH_SKEW_MS=60*1000;
const SESSION_KEYS={access:'aich_access_token',refresh:'aich_refresh_token',started:'aich_session_started_at',expires:'aich_access_expires_at'};
let refreshPromise=null;
function token(){return localStorage.getItem(SESSION_KEYS.access)||''}
function refreshToken(){return localStorage.getItem(SESSION_KEYS.refresh)||''}
function showGuest(message=''){currentUser=null;const name=$('#name'),email=$('#email'),auth=$('#authBox'),logged=$('#loggedBox'),reward=$('#rewardHub'),admin=$('#adminRewards'),msg=$('#authMsg');if(name)name.textContent='게스트';if(email)email.textContent='로그인하면 출석과 수상 인증 기록을 저장할 수 있습니다.';if(auth)auth.hidden=false;if(logged)logged.hidden=true;if(reward)reward.hidden=true;if(admin)admin.hidden=true;if(message&&msg)msg.textContent=message}
function clearSession(message=''){Object.values(SESSION_KEYS).forEach(k=>localStorage.removeItem(k));showGuest(message)}
function sessionStartedAt(){const stored=Number(localStorage.getItem(SESSION_KEYS.started)||0);if(stored>0)return stored;if(token()||refreshToken()){const now=Date.now();localStorage.setItem(SESSION_KEYS.started,String(now));return now}return 0}
function sessionWithinLimit(){const started=sessionStartedAt();if(!started)return false;if(Date.now()-started>=SESSION_MAX_AGE_MS){clearSession('보안을 위해 30일 로그인 유지 기간이 끝났습니다. 다시 로그인해 주세요.');return false}return true}
function jwtExpiresAt(jwt){try{const part=String(jwt||'').split('.')[1];if(!part)return 0;const normalized=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');const bytes=Uint8Array.from(atob(normalized),c=>c.charCodeAt(0));const exp=Number(JSON.parse(new TextDecoder().decode(bytes)).exp||0);return exp>0?exp*1000:0}catch(_){return 0}}
function accessExpiresAt(){const stored=Number(localStorage.getItem(SESSION_KEYS.expires)||0);return stored>0?stored:jwtExpiresAt(token())}
function saveSession(data,{fresh=false}={}){if(!data||!data.access_token)return false;localStorage.setItem(SESSION_KEYS.access,data.access_token);if(data.refresh_token)localStorage.setItem(SESSION_KEYS.refresh,data.refresh_token);if(fresh||!localStorage.getItem(SESSION_KEYS.started))localStorage.setItem(SESSION_KEYS.started,String(Date.now()));let expires=Number(data.expires_at||0)*1000;if(!expires&&Number(data.expires_in)>0)expires=Date.now()+Number(data.expires_in)*1000;if(!expires)expires=jwtExpiresAt(data.access_token);if(expires>0)localStorage.setItem(SESSION_KEYS.expires,String(expires));else localStorage.removeItem(SESSION_KEYS.expires);return true}
async function refreshSession(){if(refreshPromise)return refreshPromise;refreshPromise=(async()=>{const refresh=refreshToken();if(!refresh||!sessionWithinLimit())return false;try{const r=await fetch(API+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})});const d=await r.json().catch(()=>({}));if(!r.ok||!saveSession(d)){clearSession('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');return false}return true}catch(e){console.warn('session refresh',e);return false}})().finally(()=>{refreshPromise=null});return refreshPromise}
async function ensureSession(){if(!sessionWithinLimit())return false;if(!token())return refreshToken()?refreshSession():false;const expires=accessExpiresAt();if(expires&&expires-Date.now()<=SESSION_REFRESH_SKEW_MS){if(refreshToken())return refreshSession();clearSession('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');return false}return true}
function headers(auth=true){const h={'apikey':KEY,'Content-Type':'application/json'};if(auth&&token())h.Authorization='Bearer '+token();return h}
async function req(path,opt={}){const auth=opt.auth!==false,requestOpt={...opt},customHeaders=Object.assign({},opt.headers||{});delete requestOpt.auth;if(auth)await ensureSession();requestOpt.headers=Object.assign(headers(auth),customHeaders);let r=await fetch(API+path,requestOpt);if(auth&&r.status===401&&refreshToken()){const refreshed=await refreshSession();if(refreshed){requestOpt.headers=Object.assign(headers(true),customHeaders);r=await fetch(API+path,requestOpt)}}return r}"""

    if old_session_core not in app:
        raise SystemExit("Session core anchor not found")
    app = app.replace(old_session_core, new_session_core, 1)

    old_current = r"""async function current(){if(!token())return;try{const r=await req('/auth/v1/user');if(!r.ok){localStorage.removeItem('aich_access_token');return}currentUser=await r.json();$('#name').textContent=(currentUser.user_metadata&&currentUser.user_metadata.name)||currentUser.email.split('@')[0];$('#email').textContent=currentUser.email;$('#authBox').hidden=true;$('#loggedBox').hidden=false;$('#rewardHub').hidden=false;await syncSaved();await loadRewards()}catch(_){}}"""
    new_current = r"""async function current(){if(!(token()||refreshToken())||!sessionWithinLimit())return;try{const ready=await ensureSession();if(!ready&&!token())return;const r=await req('/auth/v1/user');if(!r.ok){if(r.status===401)clearSession('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');return}currentUser=await r.json();$('#name').textContent=(currentUser.user_metadata&&currentUser.user_metadata.name)||currentUser.email.split('@')[0];$('#email').textContent=currentUser.email;$('#authBox').hidden=true;$('#loggedBox').hidden=false;$('#rewardHub').hidden=false;await syncSaved();await loadRewards()}catch(e){console.warn('session restore',e)}}"""
    if old_current not in app:
        raise SystemExit("current() anchor not found")
    app = app.replace(old_current, new_current, 1)

    old_signin = r"""async function signIn(){const email=$('#authEmail').value.trim(),password=$('#authPw').value,msg=$('#authMsg');if(!email||!password){msg.textContent='이메일과 비밀번호를 입력해 주세요.';return}msg.textContent='로그인 중...';try{const r=await req('/auth/v1/token?grant_type=password',{auth:false,method:'POST',body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok){msg.textContent=d.msg||d.error_description||'로그인에 실패했습니다.';return}localStorage.setItem('aich_access_token',d.access_token);localStorage.setItem('aich_refresh_token',d.refresh_token||'');msg.textContent='로그인되었습니다.';await current()}catch(_){msg.textContent='서버 연결에 실패했습니다.'}}"""
    new_signin = r"""async function signIn(){const email=$('#authEmail').value.trim(),password=$('#authPw').value,msg=$('#authMsg');if(!email||!password){msg.textContent='이메일과 비밀번호를 입력해 주세요.';return}msg.textContent='로그인 중...';try{const r=await req('/auth/v1/token?grant_type=password',{auth:false,method:'POST',body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok){msg.textContent=d.msg||d.error_description||'로그인에 실패했습니다.';return}if(!saveSession(d,{fresh:true})){msg.textContent='로그인 세션을 저장하지 못했습니다.';return}msg.textContent='로그인되었습니다. 이 기기에서 최대 30일간 유지됩니다.';await current()}catch(_){msg.textContent='서버 연결에 실패했습니다.'}}"""
    if old_signin not in app:
        raise SystemExit("signIn() anchor not found")
    app = app.replace(old_signin, new_signin, 1)

    old_signup = r"""async function signUp(){const name=$('#authName').value.trim(),email=$('#authEmail').value.trim(),password=$('#authPw').value,msg=$('#authMsg');if(!email||password.length<8){msg.textContent='이메일과 8자 이상 비밀번호를 입력해 주세요.';return}msg.textContent='회원가입 중...';try{const redirect=location.origin+'/';const r=await req('/auth/v1/signup?redirect_to='+encodeURIComponent(redirect),{auth:false,method:'POST',body:JSON.stringify({email,password,data:{name}})});const d=await r.json();if(!r.ok){msg.textContent=d.msg||d.error_description||'회원가입에 실패했습니다.';return}if(d.access_token){localStorage.setItem('aich_access_token',d.access_token);localStorage.setItem('aich_refresh_token',d.refresh_token||'');msg.textContent='가입 및 로그인되었습니다.';await current()}else msg.textContent='가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.'}catch(_){msg.textContent='서버 연결에 실패했습니다.'}}"""
    new_signup = r"""async function signUp(){const name=$('#authName').value.trim(),email=$('#authEmail').value.trim(),password=$('#authPw').value,msg=$('#authMsg');if(!email||password.length<8){msg.textContent='이메일과 8자 이상 비밀번호를 입력해 주세요.';return}msg.textContent='회원가입 중...';try{const redirect=location.origin+'/';const r=await req('/auth/v1/signup?redirect_to='+encodeURIComponent(redirect),{auth:false,method:'POST',body:JSON.stringify({email,password,data:{name}})});const d=await r.json();if(!r.ok){msg.textContent=d.msg||d.error_description||'회원가입에 실패했습니다.';return}if(d.access_token){saveSession(d,{fresh:true});msg.textContent='가입 및 로그인되었습니다. 이 기기에서 최대 30일간 유지됩니다.';await current()}else msg.textContent='가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.'}catch(_){msg.textContent='서버 연결에 실패했습니다.'}}"""
    if old_signup not in app:
        raise SystemExit("signUp() anchor not found")
    app = app.replace(old_signup, new_signup, 1)

    old_signout = "function signOut(){localStorage.removeItem('aich_access_token');localStorage.removeItem('aich_refresh_token');location.reload()}"
    new_signout = "function signOut(){clearSession();location.reload()}"
    if old_signout not in app:
        raise SystemExit("signOut() anchor not found")
    app = app.replace(old_signout, new_signout, 1)

    old_boot = "load();current();\n})();"
    new_boot = "document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(token()||refreshToken()))current()});\nload();current();\n})();"
    if old_boot not in app:
        raise SystemExit("Boot anchor not found")
    app = app.replace(old_boot, new_boot, 1)

    APP.write_text(app, encoding="utf-8")

index = INDEX.read_text(encoding="utf-8")
index = index.replace('/app.js?v=103', '/app.js?v=105')
index = index.replace('AI Contest Hub v1.2', 'AI Contest Hub v1.4')
INDEX.write_text(index, encoding="utf-8")

required = [
    "AICH_SESSION_30D_V1",
    "SESSION_MAX_AGE_MS=30*24*60*60*1000",
    "grant_type=refresh_token",
    "refreshPromise",
    "saveSession(d,{fresh:true})",
    "aich_session_started_at",
    "/app.js?v=105",
    "AI Contest Hub v1.4",
]
combined = APP.read_text(encoding="utf-8") + INDEX.read_text(encoding="utf-8")
missing = [item for item in required if item not in combined]
if missing:
    raise SystemExit(f"Missing required session markers: {missing}")

print("Applied secure 30-day session persistence")
