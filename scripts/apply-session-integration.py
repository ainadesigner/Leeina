from pathlib import Path

APP = Path("app.js")
ADMIN = Path("admin.js")
RECOVERY = Path("recovery.js")
INDEX = Path("index.html")

app = APP.read_text(encoding="utf-8")
if "AICH_SESSION_INTEGRATION_V1" not in app:
    marker = "// AICH_SESSION_30D_V1"
    if marker not in app:
        raise SystemExit("30-day session marker missing")
    app = app.replace(marker, marker + "\n// AICH_SESSION_INTEGRATION_V1", 1)

    req_anchor = "async function req(path,opt={}){const auth=opt.auth!==false,requestOpt={...opt},customHeaders=Object.assign({},opt.headers||{});delete requestOpt.auth;if(auth)await ensureSession();requestOpt.headers=Object.assign(headers(auth),customHeaders);let r=await fetch(API+path,requestOpt);if(auth&&r.status===401&&refreshToken()){const refreshed=await refreshSession();if(refreshed){requestOpt.headers=Object.assign(headers(true),customHeaders);r=await fetch(API+path,requestOpt)}}return r}"
    req_bridge = req_anchor + "\nwindow.AICHSession=Object.freeze({token,refreshToken,ensure:ensureSession,request:req,clear:clearSession,save:saveSession});"
    if req_anchor not in app:
        raise SystemExit("Session request anchor missing")
    app = app.replace(req_anchor, req_bridge, 1)

    old_upload = "async function uploadProof(file){const path=`${currentUser.id}/${Date.now()}-${safeName(file.name)}`;const r=await fetch(`${API}/storage/v1/object/award-proofs/${encodeURI(path)}`,{method:'POST',headers:{'apikey':KEY,'Authorization':'Bearer '+token(),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!r.ok)throw new Error('upload '+r.status);return path}"
    new_upload = "async function uploadProof(file){if(!await ensureSession())throw new Error('session expired');const path=`${currentUser.id}/${Date.now()}-${safeName(file.name)}`;const r=await fetch(`${API}/storage/v1/object/award-proofs/${encodeURI(path)}`,{method:'POST',headers:{'apikey':KEY,'Authorization':'Bearer '+token(),'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!r.ok)throw new Error('upload '+r.status);return path}"
    if old_upload not in app:
        raise SystemExit("Award proof upload anchor missing")
    app = app.replace(old_upload, new_upload, 1)
    APP.write_text(app, encoding="utf-8")

admin = ADMIN.read_text(encoding="utf-8")
if "AICHSession" not in admin:
    old_admin_core = "function token(){return localStorage.getItem('aich_access_token')||''}\nfunction h(){return {'apikey':KEY,'Authorization':'Bearer '+token(),'Content-Type':'application/json'}}\nasync function req(path,opt={}){opt.headers=Object.assign(h(),opt.headers||{});return fetch(API+path,opt)}"
    new_admin_core = "function session(){return window.AICHSession||null}\nfunction token(){const s=session();return s&&typeof s.token==='function'?s.token():localStorage.getItem('aich_access_token')||''}\nfunction h(){return {'apikey':KEY,'Authorization':'Bearer '+token(),'Content-Type':'application/json'}}\nasync function req(path,opt={}){const s=session();if(s&&typeof s.request==='function')return s.request(path,opt);opt.headers=Object.assign(h(),opt.headers||{});return fetch(API+path,opt)}"
    if old_admin_core not in admin:
        raise SystemExit("Admin request anchor missing")
    admin = admin.replace(old_admin_core, new_admin_core, 1)

    old_signed = "async function signedProof(path){if(!path)return null;try{const r=await fetch(API+'/storage/v1/object/sign/award-proofs/'+encodeURI(path),{method:'POST',headers:h(),body:JSON.stringify({expiresIn:600})});if(!r.ok)return null;const d=await r.json();return d.signedURL?API+'/storage/v1'+d.signedURL:null}catch(_){return null}}"
    new_signed = "async function signedProof(path){if(!path)return null;try{const s=session();if(s&&typeof s.ensure==='function'&&!(await s.ensure()))return null;const r=await fetch(API+'/storage/v1/object/sign/award-proofs/'+encodeURI(path),{method:'POST',headers:h(),body:JSON.stringify({expiresIn:600})});if(!r.ok)return null;const d=await r.json();return d.signedURL?API+'/storage/v1'+d.signedURL:null}catch(_){return null}}"
    if old_signed not in admin:
        raise SystemExit("Admin signed proof anchor missing")
    admin = admin.replace(old_signed, new_signed, 1)
    ADMIN.write_text(admin, encoding="utf-8")

recovery = RECOVERY.read_text(encoding="utf-8")
if "aich_session_started_at" not in recovery:
    old_recovery = "    localStorage.setItem('aich_access_token',accessToken);\n    const refresh=hash.get('refresh_token');if(refresh)localStorage.setItem('aich_refresh_token',refresh);"
    new_recovery = "    const refresh=hash.get('refresh_token');\n    const sessionData={access_token:accessToken,refresh_token:refresh||'',expires_at:Number(hash.get('expires_at')||0),expires_in:Number(hash.get('expires_in')||0)};\n    if(window.AICHSession&&typeof window.AICHSession.save==='function')window.AICHSession.save(sessionData,{fresh:true});\n    else{localStorage.setItem('aich_access_token',accessToken);if(refresh)localStorage.setItem('aich_refresh_token',refresh);localStorage.setItem('aich_session_started_at',String(Date.now()));localStorage.removeItem('aich_access_expires_at');}"
    if old_recovery not in recovery:
        raise SystemExit("Recovery session anchor missing")
    recovery = recovery.replace(old_recovery, new_recovery, 1)
    RECOVERY.write_text(recovery, encoding="utf-8")

index = INDEX.read_text(encoding="utf-8")
index = index.replace('/admin.js?v=103', '/admin.js?v=105')
index = index.replace('/recovery.js?v=104', '/recovery.js?v=105')
INDEX.write_text(index, encoding="utf-8")

required = {
    APP: ["AICH_SESSION_INTEGRATION_V1", "window.AICHSession", "if(!await ensureSession())"],
    ADMIN: ["function session()", "s.request(path,opt)", "await s.ensure()"],
    RECOVERY: ["aich_session_started_at", "window.AICHSession.save"],
    INDEX: ["/admin.js?v=105", "/recovery.js?v=105"],
}
for path, markers in required.items():
    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise SystemExit(f"Missing integration markers in {path}: {missing}")

print("Integrated 30-day session refresh across app, admin, uploads, and recovery")
