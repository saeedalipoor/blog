import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  publishedIssues,
  renderSite,
  fetchSnapshot,
  settings,
} from './build.mjs';
const fixture = JSON.parse(
  await readFile(new URL('./fixtures/demo.json', import.meta.url), 'utf8'),
);
test('only trusted, published issues appear in every public artifact', () => {
  const other = {
    ...fixture.issues[0],
    number: 99,
    title: 'DELETED SECRET',
    labels: ['deleted'],
  };
  const stranger = {
    ...fixture.issues[0],
    number: 98,
    title: 'SPAM',
    author_association: 'NONE',
    user: { login: 'stranger' },
  };
  const pr = {
    ...fixture.issues[0],
    number: 97,
    title: 'PULL REQUEST',
    pull_request: { url: 'x' },
  };
  const issues = [...fixture.issues, other, stranger, pr];
  assert.deepEqual(
    publishedIssues(issues).map((p) => p.number),
    [3, 2],
  );
  const files = renderSite(
    { ...fixture, issues },
    {},
    'https://example.github.io/notebook/',
  );
  for (const text of files.values())
    for (const hidden of [
      'PRIVATE DRAFT',
      'Private draft body',
      'DELETED SECRET',
      'SPAM',
      'PULL REQUEST',
    ])
      assert.equal(text.includes(hidden), false);
  assert.equal(files.has('posts/1/index.html'), false);
});
test('source content is escaped, unsafe links and raw HTML do not execute', () => {
  const issue = {
    ...fixture.issues[0],
    title: '<script>alert(1)</script>',
    body: '<script>alert(2)</script>\n\n[bad](javascript:alert(3))\n\n**safe**',
    commentsData: [
      {
        user: { login: '<img onerror=bad>' },
        body: '<iframe src="javascript:bad"></iframe>',
      },
    ],
  };
  const html = renderSite(
    { repository: fixture.repository, issues: [issue] },
    {},
    'https://example.github.io/',
  ).get('posts/3/index.html');
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('href="javascript:'), false);
  assert.equal(html.includes('<iframe'), false);
  assert.ok(html.includes('<strong>safe</strong>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
test('repository subpaths, RSS, Persian direction and themes work', () => {
  const files = renderSite(
    fixture,
    { language: 'fa', theme: 'midnight', accent: 'blue' },
    'https://example.github.io/my-blog',
  );
  const html = files.get('posts/2/index.html');
  assert.match(html, /lang="fa" dir="rtl"/);
  assert.match(html, /theme-midnight accent-blue/);
  assert.ok(html.includes('href="/my-blog/assets/site.css"'));
  assert.ok(
    files
      .get('feed.xml')
      .includes('https://example.github.io/my-blog/posts/2/'),
  );
});
test('explicitly trusted app or organization authors can publish', () => {
  const issue = {
    ...fixture.issues[0],
    author_association: 'MEMBER',
    user: { login: 'example-writer' },
  };
  assert.equal(publishedIssues([issue]).length, 0);
  assert.equal(
    publishedIssues([issue], { trustedAuthors: ['example-writer'] }).length,
    1,
  );
  assert.throws(() => settings({ theme: '<script>' }));
});
test('API pagination loads posts and comments, and API errors stop publication', async () => {
  let requests = [];
  const fetcher = async (url) => {
    requests.push(url);
    return Response.json(
      url.includes('/comments')
        ? [{ body: 'A reply', user: { login: 'reader' } }]
        : [fixture.issues[0]],
    );
  };
  const data = await fetchSnapshot('example/notebook', 'test-token', fetcher);
  assert.equal(data.issues[0].commentsData[0].body, 'A reply');
  assert.equal(requests.length, 2);
  await assert.rejects(
    fetchSnapshot(
      'example/notebook',
      'test-token',
      async () => new Response('unavailable', { status: 503 }),
    ),
    /publishing stopped/,
  );
  await assert.rejects(
    fetchSnapshot('example/notebook', '', fetcher),
    /GITHUB_TOKEN/,
  );
});
test('a Gitpub handle can be the public URL while Pages remains the deployment destination', () => {
  const files = renderSite(
    fixture,
    { publicURL: 'https://gitpub.net/@writer/' },
    'https://example.github.io/notebook/',
  );
  assert.ok(files.get('index.html').includes('href="/@writer/posts/3/"'));
  assert.ok(
    files.get('posts/3/index.html').includes('href="/@writer/assets/site.css"'),
  );
  assert.ok(
    files.get('feed.xml').includes('https://gitpub.net/@writer/posts/3/'),
  );
});
