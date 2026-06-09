# Modern Web Development 2025-2026

## Architecture 2025 — Web Platforms

Modern web in 2025-2026: edge-first, server components, island architecture, streaming SSR. Dominant stack: Next.js 15+/Remix + React Server Components + Tailwind CSS v4 + TypeScript. Static generation replaced by incremental Static Regeneration (ISR) with on-demand revalidation. Edge runtime (Cloudflare Workers, Vercel Edge) for sub-50ms responses.

## React Server Components (RSC)

RSC separate client vs server rendering. Components marked 'use client' for interactivity, default is server component. Benefits: zero client JS for static parts, direct database access from components, automatic code splitting. Fetch in components with async/await, Next.js deduplicates and caches automatically.

## Next.js 15+ App Router

File-based routing in app/ directory. Layouts persist across routes, loading.tsx for instant loading states, error.tsx for error boundaries. Server Actions for form handling: `'use server'` functions called directly from forms. Middleware for auth/redirects runs at edge. Route handlers in app/api/ for API endpoints.

## Tailwind CSS v4

Utility-first with CSS-first configuration. No tailwind.config.js needed — use `@theme` directive in CSS. New `@variant` system for custom states. Container queries native: `@max-md:` and `@min-lg:` prefixes. Gap utility with `gap-(--spacing-*)`. Animation system with `@keyframes` in CSS. Dark mode via `@media (prefers-color-scheme: dark)` or `class:` variant.

## Shadcn/ui Component System

Copy-paste components, not npm dependencies. Built on Radix UI primitives + Tailwind. Install: `npx shadcn@latest init`. Add components: `npx shadcn@latest add button card dialog`. Each component is a local file — fully customizable. Variants via cva (class-variance-authority). Dark mode built-in with next-themes.

## Framer Motion & Animations

Motion library (renamed from Framer Motion v11+). Animate presence for enter/exit animations. Layout animations with `layout` prop. Gesture support: drag, hover, tap, pan. Server components compatible — animations hydrate on client. Use `useInView` for scroll-triggered animations.

## Responsive Design 2025

Container queries replace media queries for component-level responsiveness. Viewport units: dvh (dynamic viewport height), svh (small), lvh (large). CSS Grid subgrid for nested layouts. `aspect-ratio` property for media containers. `:has()` selector for parent-state styling. `@container` queries with container-type: inline-size.

## Performance Optimization

Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1. Tools: Lighthouse 12, PageSpeed Insights, Web Vitals extension. Optimizations: image optimization (next/image, sharp), font loading with `font-display: swap`, code splitting via dynamic imports, lazy loading with `loading="lazy"`, preload critical assets with `<link rel="preload">`.

## Bundlers & Tooling

Vite 6 as default bundler. Turbopack for Next.js (10x faster than webpack). Biome replaces ESLint+Prettier (single tool, Rust-based). oxlint for linting (50x faster). pnpm as package manager (faster, disk-efficient). Modern web: TypeScript 5.5+, Node.js 22+ runtime.

## CSS Modern Features

`@layer` for cascade control. `@scope` for scoped styles (no more BEM). `@starting-style` for entry animations. `text-wrap: balance` for headlines. `scroll-timeline` for scroll-driven animations. `view-transition-api` for SPA-like transitions. `color-mix()` for dynamic colors. `light-dark()` for theme colors.

## Authentication 2025

NextAuth v5 (Auth.js) with multiple providers. OAuth 2.1 / OpenID Connect standard. Passkeys (WebAuthn) replacing passwords. Magic links with email. JWT with short expiry + refresh tokens. Middleware-based route protection. Server-side session validation.

## State Management

React Server State: fetch directly in components. Client State: Zustand (lightweight) or Jotai (atomic). Server State (caching): TanStack Query v5 (React Query). Form State: React Hook Form + Zod validation. URL State: search params for shareable state.

## Styling Approaches

CSS Modules for component-scoped CSS. Tailwind CSS v4 for utility-first. Panda CSS for runtime-free atomic CSS. vanilla-extract for type-safe CSS-in-JS. Linaria for zero-runtime CSS-in-JS. Choose based on team preference — all valid.

## Database & ORM

Prisma ORM (v5+) with PostgreSQL/MySQL/SQLite. Drizzle ORM (type-safe, lightweight). Supabase for managed Postgres + realtime. Neon for serverless Postgres. PlanetScale for MySQL-compatible. Edge-compatible drivers for serverless: @neondatabase/serverless, @vercel/postgres.

## Deployment Platforms

Vercel (Next.js native, edge functions, ISR). Netlify (edge functions, forms, large-scale static). Cloudflare Pages (global edge, free tier generous). Railway (full-stack, databases included). Fly.io (global VMs, close to users). Docker for containerized deployment.

## Forms & Validation

React Hook Form for performant forms. Zod for schema validation (infer TypeScript types). Conform for progressive enhancement. Server Actions in Next.js for form submission without API routes. Real-time validation with debounced onChange.

## AI Integration in Web Apps

Vercel AI SDK for streaming LLM responses. LangChain for complex AI pipelines. Hugging Face Inference API for specialized models. OpenAI/Anthropic APIs for chat. Use server components to stream AI responses. Edge-compatible for low latency.

## Monorepo Setup

Turborepo for monorepo management. pnpm workspaces. Structure: apps/web, apps/api, packages/ui, packages/config. Shared TypeScript config, ESLint, Tailwind. One `turbo.json` for pipeline orchestration. Parallel builds across packages.

## Testing Stack

Vitest (fast, Jest-compatible) for unit tests. Playwright for e2e (multi-browser, mobile emulation). Testing Library for component tests. MSW (Mock Service Worker) for API mocking. Storybook for visual regression. Coverage threshold enforcement in CI.

## PWA & Offline

Service Workers with Workbox. Manifest v3 for Chrome extensions. Push notifications via Web Push API. Service worker pre-caching for static assets. IndexedDB for offline data (Dexie.js wrapper). Background sync for queued actions.

## Security Basics

CSP headers (Content-Security-Policy). CORS configuration. CSRF tokens in forms. Rate limiting (Vercel WAF, Cloudflare). Input sanitization (DOMPurify). SQL injection prevention (parameterized queries via ORM). XSS prevention (React auto-escapes). HTTPS everywhere.

## Build & CI/CD

GitHub Actions for CI/CD. Vercel/Netlify auto-deploy on push. Preview deployments for PRs. Environment variable management. Database migrations in deploy pipeline. Lighthouse CI for performance budgets. Sentry for error tracking.

## Typography & Design

Inter, Geist, or SF Pro as system fonts. Fluid typography with clamp(). `@font-face` with woff2 format. Variable fonts for performance. CSS `font-size-adjust` for fallback consistency. Google Fonts optimized via next/font or @fontsource.

## Image & Media

AVIF/WebP formats for images. next/image for automatic optimization. blurDataURL for placeholders. Responsive images with srcSet. Video with `<video>` element (no autoplay muted on mobile). lazy loading native via `loading="lazy"`. CDN for media delivery.

## API Design

RESTful with OpenAPI/Swagger docs. tRPC for type-safe APIs (full-stack TypeScript). GraphQL with Apollo/Relay (for complex data graphs). Server-Sent Events for real-time. WebSockets for bidirectional. Rate limiting, pagination, filtering standards.

## Web Components & Micro-Frontends

Lit for lightweight web components. Module Federation (Webpack 5) for micro-frontends. Single SPA for orchestration. Custom Elements API for framework-agnostic components. Shadow DOM for style isolation. Event bus for cross-app communication.

## CSS Frameworks Comparison

2025 landscape: Tailwind CSS v4 (dominant, utility-first), Open Props (design tokens), Bootstrap 5.3+ (traditional), Pico CSS (minimal), Bulma (flexbox-based), Material UI 6 (React), Chakra UI 3 (React). Choose by team and project scope.
