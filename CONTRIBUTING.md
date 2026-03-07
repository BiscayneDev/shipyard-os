# Contributing to Shipyard OS

Thanks for wanting to contribute! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/BiscayneDev/shipyard-os.git
cd shipyard-os
npm install
npm run dev
```

The app runs at [localhost:3000](http://localhost:3000). The setup wizard will guide you through initial configuration.

## Making Changes

1. **Fork** the repo and create a branch from `main`
2. **Make your changes** — keep them focused and minimal
3. **Run the build** — `npm run build` must pass before submitting
4. **Run the linter** — `npm run lint` should be clean
5. **Open a PR** with a clear description of what you changed and why

## Code Style

- TypeScript strict mode — no `any` types
- Tailwind CSS for styling — stay within the dark theme (`#0a0a0f` bg, `#111118` cards)
- Keep components self-contained — avoid cross-page dependencies
- Use `lucide-react` for icons

## What We're Looking For

- Bug fixes
- Performance improvements
- New agent runtime integrations (LangGraph, CrewAI, etc.)
- Better mobile experience
- Accessibility improvements
- Documentation improvements

## What to Avoid

- Don't break the dark theme
- Don't add unnecessary dependencies
- Don't over-engineer — simple > clever
- Don't add features without discussing them first (open an issue)

## Reporting Bugs

Open a [GitHub Issue](https://github.com/BiscayneDev/shipyard-os/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser / OS / Node version

## Questions?

Open a [GitHub Discussion](https://github.com/BiscayneDev/shipyard-os/discussions) or file an issue.
