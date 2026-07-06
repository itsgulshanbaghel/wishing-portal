# Custom URL Page Redesign Plan

## Goal
Redesign `public/generated/custom-url.html` to match `public/index.html` header/footer, support responsive mobile/tablet/PC layout, include QR center customization (text/photo like share.html), re-assure users with green `fa-check-circle` icons, and keep the Cashfree payment flow with live-only-after-payment behavior.

## Requirements
- Same navbar/footer as `index.html` (no clunky back-link navbar)
- URL slug input with availability check
- QR center style options: Clean / Text label / Photo inside
- Text center input with live preview
- Photo upload with preview
- Live QR preview panel
- Cashfree payment: create order -> redirect -> status polling -> activate URL
- Minimal, clean content optimized for mobile and desktop
- Responsive breakpoints around 1024px, 768px, 480px
- Green check-circle benefit cards to emotionally convince users to pay

## Steps
1. Read `public/generated/custom-url.html` current contents
2. Read `public/generated/share.html` QR center text/photo implementation
3. Read `public/index.html` navbar/footer and responsive CSS
4. Write new `public/generated/custom-url.html`:
   - Include header/footer matching index.html structure and classes
   - Include responsive layout with 2-column grid on desktop, stacked on mobile
   - Include form: slug input, QR center type radio cards, text input, file upload
   - Include live QR preview sidebar
   - Include benefit strip with green check icons
   - Include unchanged payment JavaScript flow
5. Verify output file renders and key sections exist
