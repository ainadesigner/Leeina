import { appendFile, access } from 'node:fs/promises';
import process from 'node:process';

if (process.platform !== 'darwin' || !process.env.GITHUB_ACTIONS || !process.env.GITHUB_ENV) {
  process.exit(0);
}

const developerDir='/Applications/Xcode_26.3.app/Contents/Developer';
try {
  await access(developerDir);
} catch {
  console.error(`Required Xcode not found: ${developerDir}`);
  process.exit(1);
}
await appendFile(process.env.GITHUB_ENV, `DEVELOPER_DIR=${developerDir}\n`, 'utf8');
console.log(`Selected Xcode 26.3 for subsequent CI steps: ${developerDir}`);
