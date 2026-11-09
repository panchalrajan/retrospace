# Retrospace Next.js POC

A retrospective workspace with retro items and action items, paginated tables,
filters, voting, comments, owner/status/date pickers, editing dialogs, a timer,
and Markdown/Confluence clipboard export. The app uses the Next.js Pages Router,
React 18, and Atlassian Design System components and tokens.

## Run locally

```sh
npm install
npm run dev
```

The initial HTML includes Atlassian theme styles so browser refresh does not wait
for client-side theme initialization. Theme selection follows the operating system
on the first visit and can be overridden with the theme toggle.

Data and identity currently use fixtures and browser localStorage. Table Refresh
re-reads that saved data without navigating. There is no BFF or authentication
integration. Settings offers a debug checkbox for a separate empty-data workspace.
Profile and the board Close action are placeholders.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

See [the quality audit](docs/code-quality-audit.md) for completed fixes, remaining
production blockers, and verification limits.
