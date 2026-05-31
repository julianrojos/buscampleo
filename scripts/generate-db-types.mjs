import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const rootDir = resolve(fileURLToPath(new URL('../', import.meta.url)));
const outputFile = resolve(rootDir, 'src/lib/supabase/database.types.ts');

async function main() {
  const { stdout } = await execFileAsync(
    resolve(rootDir, 'node_modules/.bin/supabase'),
    ['gen', 'types', 'typescript', '--linked', '--schema', 'public'],
    { cwd: rootDir, maxBuffer: 10 * 1024 * 1024 },
  );

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, stdout, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
