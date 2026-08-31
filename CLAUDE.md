# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## What this repository is

This is a Hexo 5.4.2 static blog site, not a general application. Markdown posts and static assets are transformed into a deployable HTML/CSS/JavaScript site. The blog content is primarily Chinese embedded-systems and software notes, including CAN/IIC/SPI/UART protocols, ARM/RISC-V, STM32, RTOSes, Rust, and source-code reading.

## Common commands

Run these from the repository root after installing Node.js dependencies:

```bash
npm ci              # install the locked dependency tree
npm run server      # start the local Hexo preview server
npm run clean       # remove Hexo-generated state/output
npm run build       # generate the static site into public/
npm run deploy      # generate/deploy via hexo-deployer-git
npm run validate:codeblocks  # validate fence labels and custom Prism grammars
```

The scripts are defined in `package.json`. There is no configured lint command, test script, test framework, or single-test command in this repository. For a clean rebuild, use `npm run clean && npm run build` (or the platform-equivalent command separator).

Deployment requires the configured Git SSH credentials/remotes. `npm run deploy` publishes to `git@github.com:paopaoziye/paopaoziye.github.io.git` on `main`; it is separate from the source repository. There is no GitHub Actions deployment workflow. Dependabot is configured for daily npm dependency checks in `.github/dependabot.yml`.

## Architecture and important conventions

- `_config.yml` is the root Hexo integration point. It reads authored material from `source/`, writes generated output to `public/`, selects the local `themes/hexo-theme-matery` theme, enables Prism highlighting, search XML generation, pinyin permalinks, emoji handling, lazy-loaded post images, and Live2D.
- `source/_posts/*.md` is the authoritative article content. Posts use YAML front matter based on `scaffolds/post.md`; preserve fields such as `date`, `toc`, `tag`, `categories`, `summary`, and `img` when editing articles. Create future posts with `hexo new` so the scaffold writes a stable creation date into the Markdown; builds must not rewrite source dates. `post_asset_folder` is disabled, so article diagrams are normally linked as root-relative `/image/...` paths backed by `source/image/`.
- `source/about`, `source/tags`, `source/categories`, `source/friends`, `source/contact`, and `source/404` contain small page entry points whose front matter selects a theme layout. Site data such as friends is stored under `source/_data/`.
- `themes/hexo-theme-matery` is vendored and actively customized. Its `_config.yml` controls navigation, profile/homepage widgets, feature-image fallbacks, code-block behavior, effects, and optional integrations. Its EJS layouts under `layout/` render the common page shell and post/index/archive/page views; its CSS/JS and media directories provide the runtime assets.
- `themes/hexo-theme-matery/scripts/block.js` registers the custom paired Hexo tags `{% wrong %}`, `{% right %}`, `{% warning %}`, and `{% list %}`. Many posts depend on these tags, so do not replace them with ordinary Markdown without checking the rendered result.
- Post hero images use the front-matter `img` path when present; otherwise the theme chooses a configured fallback from `theme.featureImages`. Keep referenced files under the theme media tree available when changing post metadata.
- `db.json`, `public/`, and `.deploy_git/` are ignored Hexo state/output rather than authoring sources. Prefer `source/`, configuration, and the theme as the source of truth. This repository intentionally keeps `node_modules/` tracked so a fresh clone with a globally available Hexo CLI can run `hexo s` directly; keep `package-lock.json` synchronized when dependencies change.
- The production site URL is `https://paopaoziye.github.io`, and deployment targets the separate GitHub Pages repository. Treat URL/canonical-link changes as deployment configuration changes, not content-only edits.

## Editing workflow

For article changes, edit the Markdown and any corresponding files under `source/image/`, then run `npm run validate:codeblocks` and preview with `npm run server` or validate the generated site with `npm run clean && npm run build`. Run `npm run clean` once after large source-history cleanup to rebuild Hexo's ignored `db.json`; avoid adding unused `hexo-*` dependencies because Hexo loads each one during startup. Use canonical fences `arm-gas`, `riscv`, `devicetree`, `kconfig`, `cmake`, and `makefile`; reserve `nasm` for actual x86/NASM code. For theme behavior or styling, change the vendored theme files and regenerate because templates, custom tags, and assets only take effect during Hexo generation.
