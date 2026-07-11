# Dan Flashes

An in-universe e-commerce marketplace for Dan Flashes — the fictional shirt store from *I Think You Should Leave with Tim Robinson*. Users create, buy, and sell one-of-one patterned shirts priced by how complicated they are, using a fake currency called Bones.

## Core Concept

The more complicated the pattern, the more it costs. That's how it works here.

Users compose layered patterns onto shirt templates using a visual designer, then list them for sale on the marketplace. Every shirt is one-of-one. When you sell it, it's gone.

## Economy

### Currency: Bones

- **Signup bonus:** Fixed amount of Bones awarded on account creation with verified email
- **Daily login reward:** Users collect a small Bones allowance each day they log in
- **Sales:** Selling a shirt transfers Bones from buyer to seller

### Sinks

- **House cut:** 10-15% of every sale is removed from circulation
- **Listing fee:** A small Bones fee is charged to list a shirt for sale

### Pricing

- Sellers set their own price with a **minimum floor equal to the complexity score**
- You cannot undersell what the pattern is worth

## Pattern Designer

### Composer

A layer-based visual composer where users build patterns by stacking elements on a flat 2D shirt template.

- **15-20 pattern elements at launch** across two categories:
  - Geometric: stripes, chevrons, diamonds, zigzags, grids, etc.
  - Classic textile: paisley, plaid, houndstooth, argyle, etc.
- **Per-layer customization:** color, scale, and rotation
- **Shirts only** at launch

### Complexity Scoring

```
complexity = layers x distinct_elements x colors
price_floor = complexity x base_price
```

Where `base_price` is a tunable constant (e.g., 50 Bones).

The complexity math is displayed on every listing — the absurd pricing feels "justified."

### Rendering

- Patterns stored as **structured JSON** (layers, elements, colors, scale, rotation)
- Rendered as **composited SVGs** for crisp display at any size
- **PNG rasterization** on save for thumbnails and Open Graph previews

## Marketplace

### Browsing

- Visual grid layout, default sorted by **newest listed**
- Filters: price range (min/max Bones), pattern elements used
- No search — the fun is browsing

### Listings

- One-of-one: each shirt has a single owner
- Selling transfers ownership to the buyer
- Listing fee charged on creation
- House cut deducted from sale price

### Shirt Detail Page

- Large shirt rendering
- Price in Bones
- Creator username
- Favorites count
- Complexity breakdown with visible math
- Shareable link with Open Graph image preview

### Leaderboard

- Most complicated shirt ever sold

## Social Features

### User Profiles

- Username
- Shirt collection (owned and created)
- Stats: Bones balance, shirts owned, shirts created

### Interactions

- Favorites on listings
- Browsable user collections

## Tech Stack

| Layer             | Choice                                                    |
| ----------------- | --------------------------------------------------------- |
| Framework         | TanStack Start (React, TanStack Router, and Vite)          |
| Server            | TanStack Start server functions and server routes         |
| Database          | PostgreSQL (Supabase)                                     |
| Auth              | Supabase Auth (social login, cookie-based SSR sessions)   |
| Object storage    | Supabase Storage (generated thumbnails and share images)  |
| Hosting / runtime | Netlify Free initially; Railway Node service when scaling |
| Rendering         | Client-side SVG compositing + server-side PNG export      |

### Application Architecture

- Use TanStack Router's file-based routes and route loaders for marketplace, listing, leaderboard, and profile reads. Server-render public pages for fast first loads, crawlable listings, and social metadata.
- Keep the pattern designer primarily client-side. The structured pattern JSON is the source of truth; preview it as SVG in the browser and validate it again on the server before saving.
- Use TanStack Start server functions for application-owned reads and mutations such as creating a shirt, listing it, favoriting it, claiming a daily reward, and purchasing it.
- Use server routes only where a raw HTTP endpoint is useful, such as auth callbacks, externally callable endpoints, or binary image responses.
- Keep database access, service-role credentials, pricing rules, and economy logic in server-only modules. Validate every server-function input and enforce authorization inside the function; a protected page alone is not a security boundary.
- Configure Supabase Auth for SSR with cookie-backed sessions and the PKCE flow so the same user session is available to route loaders and server functions.
- Perform purchases as a single PostgreSQL transaction: lock or conditionally update the listing, verify ownership and buyer balance, transfer the shirt and Bones, apply the house cut, and close the listing atomically. Use the same approach for any reward or fee operation that changes a balance.
- Generate PNG thumbnails and Open Graph images on save, store them in Supabase Storage, and serve the stored result through the CDN. Keep this work on the Node.js runtime until the selected SVG rasterization library is proven compatible with an edge runtime.

### Free-Tier Strategy

- Start on Netlify's free plan. Use the official TanStack Start Vite plugin so local development emulates the production platform and the app remains straightforward to deploy from Git.
- Use free deploy previews for routine testing and promote changes to production intentionally; production deploys consume free-tier credits.
- Serve generated images from Supabase Storage rather than bundling or proxying them through Netlify. Cache public marketplace and listing responses where freshness rules allow to reduce Netlify bandwidth and function compute.
- Design the initial dataset for Supabase's free quotas: 500 MB of database data, 1 GB of stored files, and 5 GB each of cached and uncached monthly egress. Compress generated images and avoid retaining obsolete render variants. Free Supabase projects pause after one week without activity, which is acceptable during development but should be reassessed before a public launch.
- Monitor Netlify usage alerts and treat sustained usage above 75% of the monthly allowance as the point to reassess hosting. The free plan has a hard cost ceiling, but sites pause after exhausting their allowance until the next billing cycle or an upgrade.
- If the app outgrows Netlify Free, prefer Railway when server-side PNG generation, predictable Node.js behavior, or sustained compute is the main need. Compare it with Netlify's paid tier when automatic serverless scaling and CDN delivery matter more, or with Cloudflare Workers when request volume and bandwidth dominate. A Cloudflare move may require browser-side or WebAssembly-based PNG generation because its runtime only supports a subset of Node.js APIs.

### Framework Guardrails

- Do not depend on React Server Components for the initial release. TanStack Start supports SSR and streaming without making its experimental RSC support a core architectural dependency.
- Treat TanStack Query as optional. Start with route loaders and router caching; add Query only where client-side refetching, optimistic updates, or shared cache behavior clearly needs it.
- Pin TanStack Start and Supabase SSR package versions and review their release notes during upgrades while either package remains pre-1.0.
- Keep hosting-specific code isolated so the application can move to another supported TanStack Start target without changing domain logic.

## Tone and Design

Deadpan serious, in-universe fashion brand aesthetic. Designed as if Dan Flashes hired a real agency to build their e-commerce site. Clean layout, fashion-brand typography, absurd copy delivered completely straight.

> "Our patterns speak for themselves. The more complicated the pattern, the more it costs. That's how it works here."
