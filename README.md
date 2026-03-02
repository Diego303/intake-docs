# intake-docs

Documentation website for [intake](https://github.com/Diego303/intake-cli) — the CLI tool that transforms raw requirements from any source into executable, verifiable specs for AI agents.

Built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Stack

- **Astro 5** — Static site generator
- **Space Grotesk + JetBrains Mono** — Typography
- **Dark Blueprint** design system — Zero border-radius, solid shadows, orthogonal layout
- **i18n** — Spanish (default) + English

## Project structure

```
src/
├── components/          # Astro components (Navbar, Footer, Prose, DocsSidebar...)
│   └── sections/        # Landing page sections (Hero, Diagram, Features...)
├── content/
│   ├── docs/            # Spanish documentation (Markdown)
│   └── docs-en/         # English documentation (Markdown)
├── config/              # Version configuration
├── i18n/                # Translations and i18n utilities
├── layouts/             # Base HTML layout
├── pages/               # Routes (landing, docs hub, doc pages)
│   ├── docs/            # Spanish docs routes
│   └── en/              # English routes (landing + docs)
└── styles/              # Global CSS and design tokens
```

## Commands

| Command              | Action                                       |
| :------------------- | :------------------------------------------- |
| `pnpm install`       | Install dependencies                         |
| `pnpm dev`           | Start local dev server at `localhost:4321`    |
| `pnpm build`         | Build production site to `./dist/`            |
| `pnpm preview`       | Preview the build locally before deploying    |

## Deployment

The site deploys automatically to GitHub Pages via the workflow in `.github/workflows/deploy.yml` on push to `main`.

Live at: `https://Diego303.github.io/intake-docs/`
