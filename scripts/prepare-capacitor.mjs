import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=process.cwd();
const out=resolve(root,'www');
const files=['index.html','style.css','admin.css','app.js','admin.js','recovery.js','native-bridge.js'];

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of files){
  await cp(resolve(root,file),resolve(out,file));
}

const indexPath=resolve(out,'index.html');
let html=await readFile(indexPath,'utf8');
html=html.replace(
  /<script src="\/app\.js\?v=\d+" defer><\/script>/,
  '<script src="/native-bridge.js" defer></script>\n$&'
);
html=html.replace(/AI Contest Hub v\d+\.\d+/,'AI Contest Hub v1.4');
await writeFile(indexPath,html,'utf8');

console.log('Prepared Capacitor web assets in www/ for Android 1.4');
