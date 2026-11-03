# Serranos Cafe — website

A one-page site for Serranos Cafe, Tarneit Gardens: the full menu, ordering links (Uber Eats, phone, directions), live opening status and the cafe's own photos. Built with Astro 7, GSAP and Lenis, and deployable as plain static files.

## Run it

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs static files to dist/
npm run preview   # serve the built site
```

## Edit the content

Everything a cafe owner would want to change lives in three files:

| File | What's in it |
| --- | --- |
| `src/data/site.ts` | Phone, address, opening hours, Uber Eats / DoorDash / Instagram / Facebook links, rating |
| `src/data/menu.ts` | Every section, dish, price, description, dietary tag and badge |
| `src/data/photos.ts` | Which photo is which, its alt text and crop focus |

- **Hours** drive the live "Open now · until 4pm" status (Melbourne time), the highlighted day in the hours table and Google's structured data.
- **DoorDash**: paste the store URL into `links.doorDash` and a DoorDash row appears in the order section and footer.
- **Photos**: drop a new `.jpg` into `src/assets/photos/`, register it in `photos.ts`, then reference its key from a menu item's `photo` field. Items with a photo get a hover preview on desktop and a thumbnail on mobile. Astro generates AVIF/WebP at the right sizes on build.
- **Domain**: set `site` in `astro.config.mjs` and `url` in `site.ts` to the real domain before launch.

## What's in the page

1. **Hero**: the logo's diagonal slash becomes the edge between paper and photo. The wordmark is drawn twice, so letters switch colour exactly where they cross the cut.
2. **Marquee**: a tilted band that speeds up, and reverses, with your scroll.
3. **The short version**: a statement that ink-fills word by word as you scroll.
4. **The cut**: a pinned scene where a hairline slash opens into a full-bleed photo.
5. **Signatures**: a pinned horizontal gallery on desktop and a swipe carousel on mobile.
6. **Menu**: a sticky index with a live section counter, dietary filters (V / GFO), cursor-following photo previews and a sticky chip bar on mobile.
7. **Order**: Uber Eats, call ahead, directions.
8. **Visit**: address, coordinates, the hours table with today highlighted, and the coffee beans they retail.
9. **Footer**: Instagram strip, links, giant wordmark.

On every page, mobile gets a floating Call / Menu / Order bar, and the first visit opens with a short logo intro.

## Performance and accessibility

Lighthouse (local production build): **Performance 95 mobile / 98 desktop · Accessibility 100 · Best practices 100 · SEO 100**, CLS 0.

- Static HTML with inlined CSS, self-hosted fonts with metric-matched fallbacks, and responsive AVIF/WebP images.
- The hero intro is pure CSS and touches only transforms and clip-paths, so it never shifts layout.
- `prefers-reduced-motion` turns off smooth scrolling, pinning and reveals, and the page stays fully usable.
- With JavaScript disabled everything is still readable and every link works. If the script fails to boot, the page falls back to its static state after 4 seconds.
- `CafeOrCoffeeShop` structured data includes the address, geo, hours, order action and the full menu with prices, ready for Google rich results.

## Deploy

`dist/` is plain static files. Netlify, Vercel or Cloudflare Pages all work with build command `npm run build` and output directory `dist`.

## Content sources and things to confirm with the owner

- **Photos** come from the cafe's own Instagram posts (@serranoscafe). Ask the owner for the originals at full resolution before launch.
- **The logo** is rebuilt in type (Young Serif plus the slash). Swap in their vector file if they have one.
- **Prices** come from the cafe's Uber Eats listing (November 2026). Delivery-app prices are often marked up, so confirm in-store prices.
- **Descriptions** for the burgers, schnitzel, parma, steak and kids items were written from the dish names. Have the owner check them.
- **Hours** differ between sources. This site uses Mon–Fri 7–4, Sat 7:30–3, Sun 8–3. Instagram says Mon–Fri 7–3:30 and Sat–Sun 8–3, and Uber Eats says 8–3 daily.
- **Phone**: (03) 9731 6233 is used throughout. The Uber Eats listing also shows a mobile, +61 423 825 750.
- **DoorDash**: no listing was found, so that row is hidden until a URL is added.
