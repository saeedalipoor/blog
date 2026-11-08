# Your Gitpub blog on GitHub Pages

This folder is a standalone blog. It reads your repository's issues, renders static pages, and deploys with GitHub Actions. It does not depend on Gitpub's servers to build or serve the blog.

Gitpub can also install this template automatically inside `.gitpub/`. Use **Set up automatic publishing** in the app after granting its required permissions. The standalone instructions below are for manual installation at the repository root.

## Install in a dedicated blog repository

1. Unzip this template at the root of your blog repository. Include the hidden `.github/workflows/publish.yml` file. It must be on the default branch. Use a dedicated blog repository: eligible issues in it become posts.
2. Update `gitpub.json`. Or, in Gitpub's **Your account** screen, save your publication, connect a repository, and download **blog settings**. Replace this template's `gitpub.json` with that file. The download adds your GitHub username to the trusted writers.
3. Open the repository's **Settings → Pages → Build and deployment → Source**, and choose **GitHub Actions**. This step needs repository administration access. Private repositories need a GitHub plan that supports Pages.
4. Open **Actions → Publish Gitpub blog → Run workflow** for the initial deployment. GitHub may ask you to enable Actions first. Review the workflow before enabling it.
5. Create an issue with the `draft` label. Write the post in its body, then remove `draft` when it is ready to publish. You can do the same through Gitpub's connected GitHub workspace.

The workflow receives `GITHUB_TOKEN` automatically. Do not add a personal token to any repository file. Build jobs can read issues but cannot deploy. The separate deploy job has only Pages and identity-token permissions. Issue text is passed through the GitHub API to a safe Markdown renderer, never interpolated into shell commands.

## Publishing rules

- Any issue by the repository owner or an explicit collaborator is a post unless labeled `draft` or `deleted` (case-insensitive).
- Public visitors' issues do not publish automatically. For organization writers and GitHub App bots, add the exact login to `trustedAuthors` in `gitpub.json`. Only add writers you want to trust with publishing.
- Pull requests are never posts.
- Removing `draft` publishes. Adding `draft` unpublishes. Adding `deleted` removes the post from the site. Closing an issue alone does not unpublish it.
- Editing a published issue immediately queues a new build. To edit privately, first add `draft`; this removes the current public post too. Separate draft revisions of a still-public post are not implemented.
- Post URLs use stable issue numbers: `posts/123/`. Changing a title does not change its URL.
- Comments are snapshots of issue comments at build time. Comment changes trigger rebuilding. Readers can follow the discussion link to reply on GitHub; the static site does not contain authentication secrets or a comment-writing backend.
- A successful rebuild replaces the published site, removing drafts and deleted posts from the new artifact, feed, and sitemap. Public copies and caches may remain outside your control.
- A public repository's draft issues remain readable on GitHub. A private repository can keep source issues private while publishing selected posts as public Pages.

## Appearance

Configure `title`, `description`, `author`, and `language` (`en` or `fa`). `theme` is `paper`, `minimal`, or `midnight`; `accent` is `sage`, `clay`, or `blue`; `font` is `serif` or `sans`; `width` is `comfortable` or `wide`. Set `includeComments` to false to omit comment bodies from the generated site.

Persian fonts are bundled into the static output. Persian pages use RTL. Markdown supports paragraphs, headings, lists, links, images, quotes, tables, and code. Raw HTML is skipped; unsafe link schemes are removed.

An optional `publicURL`, such as `https://gitpub.net/@your-handle/`, overrides the public address used in the generated HTML, feed, and sitemap. The Gitpub settings download includes it. Without that field, the Pages action supplies the site's base URL, including repository subpaths or a configured custom domain. To use a custom domain, configure it in GitHub Pages settings and add its DNS records with your domain provider. Changing domains requires rebuilding the site so canonical, feed, and sitemap URLs update.

## Local preview

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm demo
python3 -m http.server 4174 --directory _site
```

Open `http://127.0.0.1:4174`. The demo uses fictional fixture posts and makes no GitHub requests.

For a real build, provide `GITHUB_REPOSITORY`, `GITHUB_TOKEN`, and `SITE_URL` as environment variables and run `pnpm build`. The token needs read access to issues. Never print or commit it. The build stops on API errors, leaving the last successful Pages deployment intact.

## Ownership and limits

Transfer the entire repository to take the source issues, comments, settings, and publishing workflow with you. Check the recipient's Pages eligibility and update domain settings after transfer. A newly transferred repository may need Actions or its Pages environment enabled again.

GitHub Pages is for the published blog; Gitpub's login, editor, account database, and invite list run elsewhere. Pages usage rules and GitHub Actions quotas still apply. No deployment time or unlimited publishing capacity is promised.

Official references: [Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

When taking a blog away from Gitpub, remove or change `publicURL` and rebuild so links and asset paths use the new address. Gitpub path-based blogs are served as sandboxed static documents; arbitrary JavaScript and forms are not allowed on that shared origin.
