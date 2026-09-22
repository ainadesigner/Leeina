'use strict';
const {ORIGIN,esc,pathFor,opportunity,aiLabel,deadlineInfo,fetchRows,layout,send,errorPage,readOnly} = require('../lib/seo');
module.exports = async function handler(req,res) {
  if (!readOnly(req,res)) return;
  const id = req.query?.id;
  if (typeof id !== 'string' || !/^[\p{L}\p{N}_-]{1,250}$/u.test(id)) return errorPage(res,404);
  try {
    const rows = await fetchRows({select:'*',id:'eq.' + id,limit:'1'});
    if (!rows.length) return errorPage(res,404);
    const c = opportunity(rows[0]), deadline = deadlineInfo(c.deadline);
    const description = (c.summary || `${c.title}의 모집 일정, 참가 자격과 공식 모집요강을 확인하세요.`).replace(/\s+/g,' ').slice(0,160);
    const block = (label,value) => value ? `<section class="info"><h2>${label}</h2><p>${esc(value)}</p></section>` : '';
    const body = `<nav class="breadcrumbs" aria-label="현재 위치"><a href="/">홈</a><span>/</span><a href="/opportunities">공모전 목록</a></nav><article class="detail"><aside>${c.image ? `<img class="poster" src="${esc(c.image)}" alt="${esc(c.title)} 포스터" referrerpolicy="no-referrer">` : '<div class="poster placeholder">AI / HUB</div>'}<p class="muted">일정과 참가 조건은 변경될 수 있습니다.<br>지원 전 공식 모집요강을 확인해 주세요.</p></aside><div><div class="tags"><span>${esc(c.category)}</span><span>${aiLabel(c.ai)}</span><span class="${deadline.label === '마감' ? 'closed' : ''}">${deadline.label}</span></div><h1>${esc(c.title)}</h1>${block('주최 · 모집 지역',[c.host,c.country].filter(Boolean).join(' · ') || '공식 모집요강 확인')}${block('모집 마감',deadline.date)}${block('어떤 기회인가요?',c.summary || '자세한 내용은 공식 모집요강을 확인해 주세요.')}${block('AI 사용 조건',aiLabel(c.ai))}${block('참가 자격',c.eligibility)}${block('상금 · 혜택',c.benefit)}<div class="actions">${c.source ? `<a class="button" href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">공식 모집요강 보기 ↗</a>` : '<p>공식 링크 확인이 필요해요.</p>'}<a class="button secondary" href="/?view=explore">다른 기회 탐색</a></div></div></article>`;
    const schema = {'@context':'https://schema.org','@type':'WebPage',name:c.title,description,url:ORIGIN+pathFor(c.id),inLanguage:'ko',isPartOf:{'@type':'WebSite',name:'AI Contest Hub',url:ORIGIN+'/'}};
    return send(res,200,layout({title:c.title,description,path:pathFor(c.id),image:c.image,body,schema}));
  } catch { return errorPage(res,503); }
};
