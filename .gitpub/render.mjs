import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const escape = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const markdown = (body) =>
  renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm], skipHtml: true },
      String(body || ''),
    ),
  );
const fa = {
  home: 'همهٔ نوشته‌ها',
  read: 'خواندن نوشته',
  comments: 'گفت‌وگو',
  reply: 'شرکت در گفت‌وگو',
  source: 'دیدن در گیت‌هاب',
  empty: 'اولین نوشته در راه است.',
  updated: 'آخرین تغییر',
  by: 'نوشته‌های',
  made: 'ساخته‌شده با',
};
const en = {
  home: 'All stories',
  read: 'Read story',
  comments: 'Conversation',
  reply: 'Join the conversation',
  source: 'View on GitHub',
  empty: 'The first story is on its way.',
  updated: 'Updated',
  by: 'Words by',
  made: 'Made with',
};
export function publishedIssues(issues, config = {}) {
  return issues
    .filter(
      (i) =>
        (['OWNER', 'COLLABORATOR'].includes(i.author_association) ||
          (config.trustedAuthors || []).some(
            (login) => login.toLowerCase() === i.user?.login?.toLowerCase(),
          )) &&
        !i.pull_request &&
        !i.labels.some((l) =>
          ['draft', 'deleted'].includes(
            String(typeof l === 'string' ? l : l.name).toLowerCase(),
          ),
        ),
    )
    .sort(
      (a, b) =>
        new Date(b.created_at) - new Date(a.created_at) || b.number - a.number,
    );
}
export function settings(input = {}) {
  const config = {
    title: 'My notebook',
    description: '',
    author: '',
    language: 'en',
    theme: 'paper',
    accent: 'sage',
    font: 'serif',
    width: 'comfortable',
    includeComments: true,
    trustedAuthors: [],
    ...input,
  };
  for (const [key, values] of Object.entries({
    language: ['en', 'fa'],
    theme: ['paper', 'minimal', 'midnight'],
    accent: ['sage', 'clay', 'blue'],
    font: ['serif', 'sans'],
    width: ['comfortable', 'wide'],
  }))
    if (!values.includes(config[key])) throw new Error('Invalid ' + key);
  for (const key of ['title', 'description', 'author'])
    if (typeof config[key] !== 'string' || config[key].length > 1000)
      throw new Error('Invalid ' + key);
  if (
    !Array.isArray(config.trustedAuthors) ||
    config.trustedAuthors.some(
      (a) => typeof a !== 'string' || !/^[a-zA-Z0-9_-]+(?:\[bot\])?$/.test(a),
    )
  )
    throw new Error('Invalid trusted authors');
  return config;
}
function paths(baseURL) {
  const base = new URL(baseURL);
  if (
    !['https:', 'http:'].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new Error('Invalid site URL');
  base.search = '';
  base.hash = '';
  base.pathname = base.pathname.replace(/\/?$/, '/');
  return { base: base.href, root: base.pathname };
}
function excerpt(body) {
  return String(body || '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(^|\n)\s*(#{1,6}|[-*>]|\d+\.)\s+/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 170);
}
export function renderSite(snapshot, input, baseURL) {
  const config = settings(input),
    { base, root } = paths(config.publicURL || baseURL),
    t = config.language === 'fa' ? fa : en;
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(snapshot.repository))
    throw new Error('Invalid repository');
  const posts = publishedIssues(snapshot.issues, config),
    files = new Map(),
    date = (s) =>
      new Date(s).toLocaleDateString(
        config.language === 'fa' ? 'fa-IR' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' },
      );
  const source = (n) => `https://github.com/${snapshot.repository}/issues/${n}`;
  function shell(title, description, canonical, body) {
    return `<!doctype html><html lang="${config.language}" dir="${config.language === 'fa' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(description)}"><meta name="color-scheme" content="${config.theme === 'midnight' ? 'dark' : 'light'}"><title>${escape(title)}</title><link rel="canonical" href="${escape(canonical)}"><link rel="stylesheet" href="${root}assets/site.css"><link rel="alternate" type="application/rss+xml" title="${escape(config.title)}" href="${root}feed.xml"></head><body class="theme-${config.theme} accent-${config.accent} font-${config.font} width-${config.width}"><div class="site"><header><a class="brand" href="${root}">✳ ${escape(config.title)}</a><a href="https://github.com/${snapshot.repository}">GitHub ↗</a></header><main>${body}</main><footer><span>${t.by} ${escape(config.author)}</span><a href="https://gitpub.net">${t.made} gitpub ↗</a></footer></div></body></html>`;
  }
  const list = posts
    .map(
      (p) =>
        `<a class="post-card" href="${root}posts/${p.number}/"><span class="date">${date(p.created_at)}</span><h2 dir="auto">${escape(p.title)}</h2><p dir="auto">${escape(excerpt(p.body))}</p><span class="read">${t.read} ↗</span></a>`,
    )
    .join('');
  files.set(
    'index.html',
    shell(
      config.title,
      config.description,
      base,
      `<section class="hero"><span class="asterisk">✳</span><p class="eyebrow">${t.by} ${escape(config.author)}</p><h1>${escape(config.title)}</h1><p>${escape(config.description)}</p></section><section class="post-list">${list || `<p class="empty">${t.empty}</p>`}</section>`,
    ),
  );
  for (const p of posts) {
    if (!Number.isSafeInteger(p.number) || p.number < 1)
      throw new Error('Invalid issue number');
    const comments = config.includeComments ? p.commentsData || [] : [];
    const discussion = `<section class="comments"><h2>${t.comments} <span>${comments.length}</span></h2>${comments.map((c) => `<article class="comment"><strong>${escape(c.user?.login || 'GitHub')}</strong><div class="prose" dir="auto">${markdown(c.body)}</div></article>`).join('')}<a class="reply" href="${source(p.number)}#new_comment_field">${t.reply} ↗</a></section>`;
    files.set(
      `posts/${p.number}/index.html`,
      shell(
        `${p.title} · ${config.title}`,
        excerpt(p.body),
        `${base}posts/${p.number}/`,
        `<a class="back" href="${root}">← ${t.home}</a><article class="post"><div class="date">${date(p.created_at)}</div><h1 dir="auto">${escape(p.title)}</h1><div class="prose" dir="auto">${markdown(p.body)}</div><div class="post-meta">${t.updated}: ${date(p.updated_at)} · <a href="${source(p.number)}">${t.source} ↗</a></div></article>${discussion}`,
      ),
    );
  }
  const xml = (s) => escape(s);
  files.set(
    'feed.xml',
    `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>${xml(config.title)}</title><link>${xml(base)}</link><description>${xml(config.description)}</description><language>${config.language}</language>${posts.map((p) => `<item><title>${xml(p.title)}</title><link>${xml(`${base}posts/${p.number}/`)}</link><guid isPermaLink="true">${xml(`${base}posts/${p.number}/`)}</guid><pubDate>${new Date(p.created_at).toUTCString()}</pubDate><description>${xml(excerpt(p.body))}</description></item>`).join('')}</channel></rss>`,
  );
  files.set(
    'sitemap.xml',
    `<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xml(base)}</loc></url>${posts.map((p) => `<url><loc>${xml(`${base}posts/${p.number}/`)}</loc></url>`).join('')}</urlset>`,
  );
  files.set(
    '404.html',
    shell(
      config.title,
      'Not found',
      base,
      `<div class="empty"><h1>404</h1><a href="${root}">${t.home}</a></div>`,
    ),
  );
  if (config.customDomain) files.set('CNAME', config.customDomain + '\n');
  files.set('.nojekyll', '');
  return files;
}
export async function fetchSnapshot(
  repository,
  token,
  fetcher = fetch,
  config = {},
) {
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository))
    throw new Error('Invalid repository');

  if (!token) throw new Error('GITHUB_TOKEN is required');
  async function all(endpoint) {
    const result = [];
    for (let page = 1; ; page++) {
      const r = await fetcher(
        `https://api.github.com/repos/${repository}/${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Gitpub-Pages',
          },
        },
      );
      if (!r.ok)
        throw new Error(
          `GitHub returned ${r.status}; publishing stopped to preserve the last successful site`,
        );
      const batch = await r.json();
      if (!Array.isArray(batch)) throw new Error('Unexpected GitHub response');
      result.push(...batch);
      if (batch.length < 100) return result;
    }
  }
  const issues = await all('issues?state=all&sort=created&direction=desc');
  for (const issue of publishedIssues(issues, config))
    issue.commentsData = issue.comments
      ? await all(`issues/${issue.number}/comments`)
      : [];
  return { repository, issues };
}
