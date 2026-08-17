import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=process.cwd();
const specs=[
  {
    out:'assets/icon-play.png',
    sha:'e8244395b02b5f0412b0d205f10687085e3b2203a194ec4ee82cf6d04d9ba808',
    files:[
      'assets/icon-play.b64.head00','assets/icon-play.b64.head01','assets/icon-play.b64.head02',
      'assets/icon-play.b64.head03','assets/icon-play.b64.head04','assets/icon-play.b64.head05',
      'assets/icon-play.b64.part01','assets/icon-play.b64.part02','assets/icon-play.b64.part03','assets/icon-play.b64.part04'
    ]
  },
  {
    out:'assets/icon-foreground.png',
    sha:'425ebec5fed6ad1d850758657ece6ed2a9bfe485ac45545fe51fc2c6ff7e74d5',
    files:[
      'assets/icon-foreground.b64.head00','assets/icon-foreground.b64.head01','assets/icon-foreground.b64.head02',
      'assets/icon-foreground.b64.head03','assets/icon-foreground.b64.head04','assets/icon-foreground.b64.head05',
      'assets/icon-foreground.b64.part01','assets/icon-foreground.b64.part02','assets/icon-foreground.b64.part03'
    ]
  }
];

for(const spec of specs){
  let encoded='';
  for(const file of spec.files)encoded+=(await readFile(resolve(root,file),'utf8')).replace(/\s+/g,'');
  const bytes=Buffer.from(encoded,'base64');
  const actual=createHash('sha256').update(bytes).digest('hex');
  if(actual!==spec.sha)throw new Error(`Icon source checksum mismatch for ${spec.out}: ${actual}`);
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Invalid PNG signature for ${spec.out}`);
  await writeFile(resolve(root,spec.out),bytes);
  console.log(`Reconstructed ${spec.out} (${bytes.length} bytes)`);
}
