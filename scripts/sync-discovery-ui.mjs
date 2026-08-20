import { writeFile } from 'node:fs/promises';

const VERIFIED_COMMIT='8ed6b8ab3ba77eadeae79b838fa1ae7cd14f0e2e';
const url=`https://raw.githubusercontent.com/ainadesigner/Leeina/${VERIFIED_COMMIT}/app.js`;
const response=await fetch(url,{headers:{'User-Agent':'AI-Contest-Hub-Android-Build'}});
if(!response.ok)throw new Error(`Discovery UI sync failed: HTTP ${response.status}`);
const source=await response.text();
for(const marker of ['AICH_DISCOVERY_SORT_V1','마감임박순','상금 높은 순','globalGrid']){
  if(!source.includes(marker))throw new Error(`Verified discovery UI marker missing: ${marker}`);
}
await writeFile('app.js',source,'utf8');
console.log(`Synced verified discovery UI from ${VERIFIED_COMMIT}`);
