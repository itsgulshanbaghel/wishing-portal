# STRATEGIC SEO ROADMAP — TheGreeter.in

**Goal:** Establish market dominance for global digital wish creation queries across 🇮🇳 India, 🇺🇸 United States, 🇦🇪 UAE, 🇬🇧 UK, 🇨🇦 Canada, 🇦🇺 Australia, and 🇸🇬 Singapore.

---

## Phase 1: Foundation & Technical Architecture (Completed)

- [x] Standardize canonical URLs & SSL configuration (`https://thegreeter.in`).
- [x] Implement multi-region `hreflang` tags across all core landing pages (`en-in`, `en-us`, `en-ae`, `en-gb`, `en-ca`, `en-au`, `en-sg`, `x-default`).
- [x] Deploy high-converting intent landing pages:
  - `/birthday-wishes-website`
  - `/anniversary-wishes-website`
  - `/romantic-proposal-website`
  - `/festival-greetings-website`
- [x] Integrate rich JSON-LD structured data (`WebPage`, `SoftwareApplication`, `BreadcrumbList`, `FAQPage`).
- [x] Update `sitemap.xml` and `robots.txt`.
- [x] Build automated SEO regression validator (`node scripts/validate-seo.js`).

---

## Phase 2: Programmatic Landing Pages & Keyword Expansion (Months 1–3)

1. **Occasion + Relationship Intent Matrix:**
   - Create programmatic sub-pages for high-volume long-tail keywords:
     - `/birthday-wishes-for-best-friend`
     - `/birthday-wishes-for-husband`
     - `/birthday-wishes-for-wife`
     - `/1st-anniversary-wishes-website`
     - `/diwali-wishing-website-maker`
2. **Dynamic XML Sitemap Generation:**
   - Implement automated route in `server.js` (`/sitemap.xml`) to dynamically append popular custom URLs or blog additions from MongoDB Atlas.
3. **Core Web Vitals Optimization:**
   - Convert all raster images in `/assets/` to `.webp` format.
   - Implement `font-display: swap` and link preloading for Google Fonts (`Inter` & `Outfit`).

---

## Phase 3: Authority Building & International SEO (Months 3–6)

1. **Google Search Console & Bing Webmaster Tools:**
   - Submit new `sitemap.xml` and ping IndexNow API on Bing/Yandex upon new article publish.
2. **Localization Expansion:**
   - Introduce full native Hindi (`/hi/`) and Arabic (`/ar/`) URL sub-directories with translated UI strings to capture non-English queries in India and the Middle East.
3. **Backlink & Brand Strategy:**
   - Share festival wishing templates on social media platforms (Pinterest, Instagram, YouTube Shorts) to generate organic referral signals.

---

## Phase 4: Continuous Performance Monitoring

- Monitor Core Web Vitals (LCP, FID, CLS, INP) in Google PageSpeed Insights.
- Run `node scripts/validate-seo.js` as part of CI/CD pre-commit hooks to ensure zero metadata regressions.
