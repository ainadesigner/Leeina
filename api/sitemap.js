'use strict';
const {ORIGIN,esc,pathFor,fetchRows,send,readOnly} = require('../lib/seo');
module.exports = async function handler(req,res) {
  if (!readOnly(req,res)) return;
  try {
    const paths = ['/','/opportunities'];
    for (let offset = 0; ; offset += 1000) {
      const rows = await fetchRows({select:'id',order:'id.asc',limit:'1000',offset:String(offset)});
      paths.push(...rows.filter(r => /^[\p{L}\p{N}_-]{1,250}$/u.test(String(r.id))).map(r => pathFor(r.id)));
      if (paths.length > 49000) throw new Error('Sitemap index required');
      if (rows.length < 1000) break;
    }
    const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + [...new Set(paths)].map(path => `<url><loc>${esc(ORIGIN+path)}</loc></url>`).join('') + '</urlset>';
    return send(res,200,body,'application/xml; charset=utf-8');
  } catch { res.setHeader('Retry-After','120'); return send(res,503,'Sitemap temporarily unavailable','text/plain; charset=utf-8'); }
};
