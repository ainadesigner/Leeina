'use strict';
const {esc,pathFor,opportunity,aiLabel,deadlineInfo,fetchRows,layout,send,errorPage,readOnly} = require('../lib/seo');
module.exports = async function handler(req,res) {
  if (!readOnly(req,res)) return;
  const raw = req.query?.page ?? '1';
  if (typeof raw !== 'string' || !/^[1-9]\d{0,3}$/.test(raw)) return errorPage(res,404);
  const page = Number(raw), size = 48;
  try {
    const rows = await fetchRows({select:'*',order:'created_at.desc,id.asc',offset:String((page-1)*size),limit:String(size+1)});
    if (!rows.length && page > 1) return errorPage(res,404);
    const items = rows.slice(0,size).map(opportunity);
    const cards = items.map(c => { const d = deadlineInfo(c.deadline); return `<article class="listCard"><div class="tags"><span>${esc(c.category)}</span><span>${aiLabel(c.ai)}</span></div><h2><a href="${esc(pathFor(c.id))}">${esc(c.title)}</a></h2><p class="host">${esc(c.host || c.country || '주최기관 확인')}</p><p class="summary">${esc(c.summary || '공식 모집요강을 확인하세요.')}</p><p class="date"><strong class="${d.label === '마감' ? 'closed' : ''}">${d.label}</strong> · ${esc(d.date)}</p></article>`; }).join('');
    const prev = page > 1 ? `<a class="button secondary" rel="prev" href="${page === 2 ? '/opportunities' : '/opportunities?page='+(page-1)}">← 이전</a>` : '';
    const next = rows.length > size ? `<a class="button secondary" rel="next" href="/opportunities?page=${page+1}">다음 →</a>` : '';
    const body = `<section class="intro"><p class="eyebrow">FIND YOUR NEXT CHALLENGE</p><h1>도전의 시작,<br><em>AI 기회 모아보기.</em></h1><p>공모전 · 영화제 · 교육 · 지원사업의 모집요강을 살펴보세요.<br>최근 등록순이며, 마감된 기회도 함께 제공됩니다.</p><a class="button" href="/?view=explore">분야 · 마감일로 검색하기 →</a></section><div class="listHeading"><h2>공개된 기회</h2><span>${page}페이지</span></div><div class="listing">${cards || '<p>등록된 기회를 준비 중입니다.</p>'}</div><nav class="pagination" aria-label="목록 페이지">${prev}<span>${page}페이지</span>${next}</nav>`;
    return send(res,200,layout({title:page === 1 ? 'AI 공모전 · 영화제 · 교육 · 지원사업' : `AI 기회 목록 ${page}페이지`,description:'AI 공모전, 영화제, 교육과 지원사업의 일정과 참가 조건을 확인하세요.',path:page === 1 ? '/opportunities' : '/opportunities?page='+page,body}));
  } catch { return errorPage(res,503); }
};
