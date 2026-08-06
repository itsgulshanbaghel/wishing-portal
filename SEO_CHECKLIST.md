# TECHNICAL SEO & ADSENSE COMPLIANCE CHECKLIST — TheGreeter.in

**Domain:** `https://www.thegreeter.in`  
**Last Audited & Verified:** August 2026  

---

## 1. Technical & Indexing Infrastructure

- [x] **Canonical URLs:** All primary pages define absolute `https://thegreeter.in/<slug>` tags without trailing slashes.
- [x] **International Geo-Targeting (`hreflang`):** Configured across core pages and high-intent landing pages for India (`en-in`), USA (`en-us`), UAE (`en-ae`), UK (`en-gb`), Canada (`en-ca`), Australia (`en-au`), Singapore (`en-sg`), and Default (`x-default`).
- [x] **XML Sitemap:** `public/sitemap.xml` updated with lastmod timestamps, priorities, and inclusion of all core, transactional, and blog URLs.
- [x] **Robots.txt:** Configured to allow all legitimate engines (including Google AdSense crawlers `Mediapartners-Google` and `AdsBot-Google`) while blocking `/admin` and private script files.
- [x] **Automated Validator Script:** Created `scripts/validate-seo.js` to prevent metadata regression.

---

## 2. On-Page & Semantic Architecture

- [x] **Title Tags:** Optimized under 70 characters with primary brand keywords.
- [x] **Meta Descriptions:** Standardized between 50 and 160 characters targeting intent-driven search queries.
- [x] **Heading Hierarchy:** Single `<h1>` per page with clean `<h2>`/`<h3>` nested structures.
- [x] **Structured Data (JSON-LD):** Implemented `WebPage`, `BreadcrumbList`, `SoftwareApplication`, and `FAQPage` schemas across landing pages and core files.
- [x] **Image Alt Attributes:** Descriptive alt tags on key images and SVG icons.

---

## 3. High-Intent SEO Landing Pages

- [x] **Birthday Landing Page:** `/birthday-wishes-website` targeting "free birthday wish website maker", "animated birthday surprise page".
- [x] **Anniversary Landing Page:** `/anniversary-wishes-website` targeting "free anniversary wish website maker", "romantic couple surprise website".
- [x] **Love Proposal Landing Page:** `/romantic-proposal-website` targeting "free online love proposal website maker", "will you marry me webpage".
- [x] **Festival Greetings Landing Page:** `/festival-greetings-website` targeting "festival wish website maker", "Diwali, Christmas & New Year digital wishes".

---

## 4. Google AdSense Monetisation Readiness

- [x] **AdSense Auto Tag:** Installed `ca-pub-8043014881280685` on all public content pages.
- [x] **Legal Compliance:** Comprehensive Privacy Policy (with DART cookie notice), Terms of Conditions, About Us, and Contact Us pages accessible from header and footer navigation.
- [x] **Substantial Content Ratio:** High text-to-code ratio provided by long-form informational content and FAQs on landing pages.
- [x] **Premium URL Shielding:** Excluded custom URL user pages (`/_v=c`) from ad containers to preserve ad-free premium user experience.
