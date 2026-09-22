'use strict';
const ORIGIN = 'https://ai-contest-hub-v12.vercel.app';
const DATABASE = 'https://pkfaaezbwnkgjfgpovzo.supabase.co/rest/v1/contests';
// Public browser key. RLS still applies; never use a service-role key here.
const PUBLIC_KEY = 'sb_publishable_GF2VPswgkkieqYs1SCj1Hg_Fmxz0dPj';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const pathFor = id => '/contests/' + encodeURIComponent(String(id));
function safeUrl(value) { try { const u = new URL(String(value || '')); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } }
function field(row, ...keys) { for (const obj of [row, row.parsed_data || {}]) for (const key of keys) if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') return String(obj[key]); return ''; }
function opportunity(row) {
  return { id: String(row.id), title: field(row,'title_ko','title','title_original') || 'AI 공모전', host: field(row,'host','organizer'), summary: field(row,'summary_ko','summary','description'), deadline: field(row,'deadline_at','deadline','end_date'), image: safeUrl(field(row,'poster_url','thumbnail_url','image_url')), source: safeUrl(field(row,'source_url','application_url','url')), country: field(row,'country','country_code'), category: field(row,'primary_ai_category','category') || 'AI 기회', ai: field(row,'ai_badge','ai_policy','ai_usage'), eligibility: field(row,'eligibility'), benefit: field(row,'benefit','prize') };
}
function aiLabel(value) { const v = String(value).toLowerCase(); if (/필수|required/.test(v)) return 'AI 필수'; if (/일부|limited/.test(v)) return 'AI 일부 허용'; if (/불가|prohibited/.test(v)) return 'AI 사용 불가'; if (/사용 가능|allowed/.test(v) || v === '가능') return 'AI 사용 가능'; return 'AI 규정 확인필요'; }
const dateFormatter = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
function deadlineInfo(value, now = new Date()) {
  if (!value) return {label:'일정 확인',date:'공식 모집요강에서 확인해 주세요.'};
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value), dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return {label:'일정 확인',date:'공식 모집요강에서 확인해 주세요.'};
  const key = dateOnly ? value : dateFormatter.format(dt), today = dateFormatter.format(now);
  const closed = dateOnly ? key < today : dt < now;
  return {label:closed ? '마감' : key === today ? '오늘 마감' : '모집 일정', date:dateOnly ? key.replaceAll('-','. ') : dt.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) + ' (한국 시간)'};
}
async function fetchRows(params = {}) {
  const url = new URL(DATABASE);
  // Force the public status even when callers add filters.
  url.search = new URLSearchParams({...params,status:'eq.live'}).toString();
  const response = await fetch(url, {headers:{apikey:PUBLIC_KEY},signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error('Public opportunities unavailable');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid opportunities response');
  return rows;
}
function layout({title,description,path,body,image='',schema}) {
  const canonical = ORIGIN + path;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#061813"><title>${esc(title)} · AI Contest Hub</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="AI Contest Hub"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">${image ? `<meta property="og:image" content="${esc(image)}">` : ''}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/seo.css?v=1">${schema ? `<script type="application/ld+json">${json(schema)}</script>` : ''}</head><body><a class="skip" href="#main">본문으로 바로가기</a><header><a class="brand" href="/">✦ AI Contest Hub<span>.</span></a><nav aria-label="주 메뉴"><a href="/?view=explore">검색 · 필터</a><a href="/opportunities">전체 목록</a></nav></header><main id="main">${body}</main><footer><a class="brand" href="/">AI Contest Hub<span>.</span></a><p>새로운 가능성을 발견하는 곳.</p><nav><a href="/privacy.html">개인정보처리방침</a><a href="/delete-account.html">계정 삭제 안내</a></nav></footer></body></html>`;
}
function send(res,status,body,type='text/html; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type',type);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if (status >= 400) res.setHeader('X-Robots-Tag','noindex');
  return res.end(body);
}
function errorPage(res,status) {
  if (status === 503) res.setHeader('Retry-After','120');
  const title = status === 404 ? '기회를 찾을 수 없어요' : '잠시 후 다시 확인해 주세요';
  return send(res,status,layout({title,description:title,path:'/opportunities',body:`<section class="intro"><p class="eyebrow">AI CONTEST HUB</p><h1>${title}</h1><p>${status === 404 ? '공개되지 않았거나 더 이상 제공되지 않는 주소입니다.' : '공모전 정보를 연결하는 중 문제가 발생했습니다.'}</p><a class="button" href="/opportunities">전체 기회 보기</a></section>`}));
}
function readOnly(req,res) { if (req.method && !['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); send(res,405,'Method not allowed','text/plain; charset=utf-8'); return false; } return true; }
module.exports = {ORIGIN,esc,json,pathFor,safeUrl,opportunity,aiLabel,deadlineInfo,fetchRows,layout,send,errorPage,readOnly};
