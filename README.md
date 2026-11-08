# Serranos Cafe — website

A five-page site for Serranos Cafe, Tarneit Gardens: home, the full menu, the cafe's story, reviews and a visit page, with ordering links (Uber Eats, phone, directions), live opening status and the cafe's own photos. Built with Astro 7, GSAP and Lenis, and deployable as plain static files.

## Run it

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs static files to dist/
npm run preview   # serve the built site
```

## Edit the content

Everything a cafe owner would want to change lives in four files:

| File | What's in it |
| --- | --- |
| `src/data/site.ts` | Phone, address, opening hours, Uber Eats / DoorDash / Instagram / Facebook links, rating |
| `src/data/menu.ts` | Every section, dish, price, description, dietary tag and badge |
| `src/data/photos.ts` | Which photo is which, its alt text and crop focus |
| `src/data/reviews.ts` | Google / Uber Eats / Facebook ratings and the quotes on the reviews section |

- **Hours** drive the live "Open now · until 4pm" status (Melbourne time), the highlighted day in the hours table and Google's structured data.
- **DoorDash**: paste the store URL into `links.doorDash` and a DoorDash row appears in the order section and footer.
- **Photos**: drop a new `.jpg` into `src/assets/photos/`, register it in `photos.ts`, then reference its key from a menu item's `photo` field. Items with a photo get a hover preview on desktop and a thumbnail on mobile. Astro generates AVIF/WebP at the right sizes on build.
- **Ratings**: the Google figure in `reviews.ts` came from a third-party aggregator, not Google. Copy the real star rating and review count from your Google Business Profile before launch, and refresh all three platforms every few months.
- **Quotes**: the quotes are real published words about the cafe, credited to where they appeared. Swap in favourite Google reviews any time.
- **Since**: `site.since` (2016) is the earliest press found online. Change it if the cafe opened earlier.
- **Domain**: set `site` in `astro.config.mjs` and `url` in `site.ts` to the real domain before launch.

## Pages

| Route | What's on it |
| --- | --- |
| `/` | Hero with the slash cut, marquee, the short version, the cut, signatures, reviews, an index of the other pages, order, visit |
| `/menu/` | Every dish with a sticky section index, live counter, V / GFO filters and photo previews, then ordering |
| `/about/` | The story statement, numbers that count up, four values as cards that stack while you scroll, a day at the cafe from first pour to last call, the coffee |
| `/reviews/` | Google rating with stars that fill in, Uber Eats and Facebook scores, real quotes, a pull quote and a "leave a review" panel |
| `/visit/` | Address, live hours, ordering, and an FAQ (halal, gluten-free, kids, parking, bookings) with FAQPage structured data |
| `/404` | Not on the menu |

Every inner page opens with the same header: breadcrumb, live open status, a huge two-line headline with a food photo set into it, and a plate cut along the slash. Moving between pages uses a cross-document view transition, so the next page slices in along the slash. It is pure CSS with no router JavaScript, and browsers without support simply navigate.

On every page, mobile gets a floating Call / Menu / Order bar. The short logo intro plays only on a first visit to the home page.

## Performance and accessibility

Lighthouse (local production build, Lighthouse 12.6): **Accessibility 100 · Best practices 100 · SEO 100 on every page.** Performance: home 95 mobile / 99 desktop, inner pages 98 mobile / 100 desktop, CLS ≈ 0. On mobile the remaining gap is first paint under Lighthouse's simulated slow 4G (the display font and ~460 ms server response from the local preview server). A CDN host should close most of it.

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
