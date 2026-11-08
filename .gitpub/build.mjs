import { readFile, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderSite, fetchSnapshot } from './render.mjs';
export {
  renderSite,
  fetchSnapshot,
  publishedIssues,
  settings,
} from './render.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
export async function build({ snapshot, config, baseURL, outDir }) {
  const files = renderSite(snapshot, config, baseURL);
  // Render before cleaning: failed builds never upload an empty replacement site.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, 'assets'), { recursive: true });
  for (const [name, body] of files) {
    await mkdir(path.dirname(path.join(outDir, name)), { recursive: true });
    await writeFile(path.join(outDir, name), body);
  }
  await copyFile(
    path.join(here, 'site.css'),
    path.join(outDir, 'assets/site.css'),
  );
  for (const weight of [400, 600])
    await copyFile(
      require.resolve(
        `@fontsource/vazirmatn/files/vazirmatn-arabic-${weight}-normal.woff2`,
      ),
      path.join(outDir, `assets/persian-${weight}.woff2`),
    );
  return files.size;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const fixtureIndex = process.argv.indexOf('--fixture');
  const config = JSON.parse(
    await readFile(path.join(here, 'gitpub.json'), 'utf8'),
  );
  const snapshot =
    fixtureIndex >= 0
      ? JSON.parse(
          await readFile(
            path.resolve(here, process.argv[fixtureIndex + 1]),
            'utf8',
          ),
        )
      : await fetchSnapshot(
          process.env.GITHUB_REPOSITORY,
          process.env.GITHUB_TOKEN,
          fetch,
          config,
        );
  const baseURL =
    process.env.SITE_URL ||
    (fixtureIndex >= 0 ? 'http://127.0.0.1:4174/' : null);
  if (!baseURL) throw new Error('SITE_URL is required');
  console.log(
    `Built ${await build({ snapshot, config, baseURL, outDir: path.join(here, '_site') })} static files.`,
  );
}
