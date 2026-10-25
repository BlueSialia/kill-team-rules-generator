# Architectural Decision Records

All Architectural Decisions and their rationale will be documented in this file.

The format is based on the [Y-Statement](https://adr.github.io/adr-templates/#y-statement).

---

## Runtime and delivery

### Static browser application with Vite

In the context of creating small websites that can be hosted without a backend,
facing the need for a fast local development server and a portable production
build, we decided for a Vite-built static browser application to achieve simple
local development and deployment to any static host, accepting that dynamic
server-side behavior requires a separate service.

### Vanilla TypeScript and CSS

In the context of a reusable website starting point, facing the overhead of
committing to a UI framework before a project needs one, we decided for vanilla
TypeScript and CSS to achieve a small and adaptable baseline, accepting that
larger applications may later need a framework or additional conventions.
