# Phase 1: Foundation, Auth & Brand System

> **Read `MASTER_SPEC.md` in the project root first.** It is the source of truth for the entire project. This phase prompt references it heavily.

You are building Phase 1 of a 6-phase premium coconut-oil e-commerce platform for **Uggalla Oil Mills** (Sri Lankan market). **Build only what's described in this phase. Do not build features from later phases.** Stay strictly within scope.

---

## Goal of Phase 1

Establish the technical and visual foundation. By the end of this phase, the project has:
- A working Next.js 15 TypeScript app
- Supabase configured (DB + Auth + Storage)
- Complete database schema with RLS
- Email/password + Google OAuth login
- Branded base layout (header, footer, navigation, mobile menu)
- A polished design system reflecting the "Pure, Natural & Premium" aesthetic built from the Uggalla logo
- Placeholder homepage that demonstrates the brand
- A seeded admin user

---

## Tasks

### 1. Project Setup
- Initialize Next.js 15 with App Router, TypeScript (strict), Tailwind, ESLint
- Install all dependencies listed in `MASTER_SPEC.md` §2
- Set up `shadcn/ui` (init with neutral base color, then customize to the brand)
- Configure Prettier
- Create folder structure per `MASTER_SPEC.md` §12
- Create `.env.example` with all keys from `MASTER_SPEC.md` §11
- Set up a date/time utility (using `date-fns` + `date-fns-tz`) so that **all dates, delivery/pickup dates, time slots, and displayed timestamps use the Asia/Colombo timezone** consistently across server and client. Use this helper everywhere instead of raw `Date` formatting.

### 2. Brand System
- Create `lib/brand.ts` exporting brand config: `name`, `shortName`, `tagline`, `phone`, `whatsapp`, `email`, `address`, `socials` (use the shape in `MASTER_SPEC.md` §3; real contact details are placeholders to be filled by the owner)
- Brand name: **Uggalla Oil Mills**. Product brand at launch: **Royal Coco**.
- Use the color palette in `MASTER_SPEC.md` §3 — **deep forest green (primary), golden yellow (accent), warm cream (background), with sand/sage neutrals**. Define them as CSS variables in `app/globals.css` (e.g., `--color-green`, `--color-green-deep`, `--color-gold`, `--color-gold-warm`, `--color-cream`, `--color-sand`, `--color-sage`). Map them into the Tailwind theme via `tailwind.config.ts`. Keep the site eye-catching but easy on the eyes — green-dominant on cream, gold as accent (do NOT make the whole page yellow).
- Choose a typography pairing: a warm display typeface for headings (e.g., **Fraunces** or **Libre Caslon Text**) + a clean sans-serif for body (e.g., **Inter** or **DM Sans**). Load via `next/font/google`. Apply via the Tailwind theme.
- Background: warm cream, never pure white. Body text: deep green/charcoal.
- Create base utility classes for headings (`.font-display`), body, eyebrow labels, captions.
- Create a `BrandLogo` component. Place the provided logo at `public/logo.png` and render it (with the wordmark fallback in the display font). It should look great at multiple sizes; provide a compact mark-only variant for the mobile header and a full lockup for the footer.
- Create a small decorative SVG flourish derived from the logo's droplet/leaf mark for tasteful ornamentation.
- Create a `<Container>` wrapper with consistent max-width and padding
- Set up Framer Motion provider in root layout
- Respect `prefers-reduced-motion` globally

### 3. Supabase Setup
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — server client using `@supabase/ssr`
- `lib/supabase/admin.ts` — service-role client (server-only, never imported in client components)
- Set up `middleware.ts` for session refresh and admin route protection
- Create the Storage buckets needed: `product-images`, `brand-images`, `category-images`, `payment-receipts`, `bulk-attachments`, `review-images` (document bucket policies)

### 4. Database Schema & RLS
- Create migrations in `supabase/migrations/` covering **all tables** from `MASTER_SPEC.md` §6, including the oil-specific ones: `brands`, `product_sizes` (with `volume_ml`), `products` (`brand_id`, `purchase_type`, `allows_subscription`, `allows_note`), `bulk_requests`, `bulk_request_attachments`, `subscriptions`, `notification_logs`
- Use UUIDs, `numeric(12,2)` for money, integer/numeric for `volume_ml`, `timestamptz` for dates
- Add appropriate indexes (slug, status, user_id, order_number, brand_id, category_id, next_reminder_date)
- Write RLS policies per `MASTER_SPEC.md` §6 (customers see only own data; public sees published content; only admins write to admin tables; guest checkout + guest bulk requests allowed)
- Create `seed.sql` that:
  - Creates 1 brand: **Royal Coco** (active)
  - Creates 3 categories: **Bottles**, **Packets**, **Bulk** (Bulk flagged `is_bulk = true`)
  - Creates 3 delivery zones (e.g., Padukka & nearby Rs.300, Greater Colombo Rs.500, Island-wide Rs.900) — placeholder fees
  - Creates 3 time slots (e.g., 9am–12pm, 1pm–4pm, 5pm–7pm)
  - Inserts default settings row: shop info (Uggalla Oil Mills, Padukka), tax rate 0% initially, loyalty defaults (1 point per Rs.100, 100 points = Rs.50), subscription frequencies (weekly / biweekly / monthly), COD limits placeholder
- Provide clear README instructions on running migrations + seed

### 5. Auth Flows
- **Register** (`/register`): name, email, phone, password, confirm password. Zod validation. On success, create auth user + insert into `users` (role='customer'). Auto-login. Redirect home.
- **Login** (`/login`): email + password OR "Continue with Google". Google OAuth callback creates a `users` row on first login.
- **Reset password**: `/forgot-password` + `/reset-password` using Supabase password reset.
- **Logout** action from header user menu
- All auth pages use the brand design — clean cards on cream, gold accents, subtle animations, the droplet flourish
- Inline form errors with calm, branded styling
- "Continue as guest" link on login (navigates back)

### 6. Seed Admin User
- Provide `scripts/seed-admin.ts` that creates an admin user (reads `ADMIN_SEED_EMAIL` + `ADMIN_SEED_PASSWORD`), sets `users.role = 'admin'`. Document how to run it in README.

### 7. Base Layout
- **Root layout** (`app/layout.tsx`): fonts, Framer Motion provider, toaster (`sonner`), theme
- **Storefront layout** (`app/(storefront)/layout.tsx`):
  - Header: logo, nav links (Home, Shop, Bulk Orders, About, Contact), search icon, wishlist icon, account icon, cart icon with badge
  - Sticky on scroll with smooth shadow appearance
  - Mobile: hamburger → slide-in drawer menu (Framer Motion)
  - Announcement bar above header (e.g., "Free delivery on orders over Rs. 10,000" — placeholder)
  - Footer: brand lockup + story line, quick links, contact info (Padukka), newsletter signup form (visual only — no API yet), social icons, payment method icons, copyright
  - WhatsApp floating button (bottom right, opens `wa.me/<number>`)
- **Auth layout** (`app/(auth)/layout.tsx`): centered card on cream with subtle ornaments

### 8. Placeholder Homepage
A striking placeholder homepage that **demonstrates the brand aesthetic** even without products:
- Cinematic hero: full-viewport-height image (tasteful Unsplash placeholder of coconuts / golden oil via `next/image` with a remote pattern in `next.config.js`), elegant headline in the display font, sub-headline, primary + secondary CTAs
- "From our mill in Padukka" brand-story section (text + image, editorial style)
- Category showcase grid (Bottles / Packets / Bulk from seed, with hover effects)
- "Why our oil" trust strip (3–4 points: 100% pure, naturally pressed, locally sourced, freshness) with Lucide icons
- Empty "Featured products" section with elegant placeholder cards (replaced in Phase 2)
- "How it works" — 3 steps (Choose → Order → Delivered) with icons and subtle dividers
- Subscription teaser band ("Never run out — set a reorder reminder")
- Testimonial placeholder section
- Newsletter signup band
- Every section: smooth fade-in on scroll (Framer Motion)
- Mobile looks just as good as desktop

### 9. Static Pages (skeletons only)
- `/about`, `/contact`, `/faq`, `/terms`, `/privacy`, `/delivery-info` — minimal branded placeholder pages with proper layout, headings, lorem-ish content. Contact page includes a form (visual only) and a `wa.me` link + map placeholder.

### 10. Error & Not Found
- Branded `not-found.tsx` and `error.tsx`
- 404 page with an oil-droplet / coconut themed SVG illustration (elegant, on-brand)

### 11. Quality Checks (must all pass)
- TypeScript strict, zero `any`
- ESLint clean
- Mobile (375px) and desktop (1440px) both polished
- All auth flows work end-to-end (register → login → reset → logout)
- Admin user can log in (no admin dashboard yet — just verify role is set)
- RLS verified: as a regular user, confirm they cannot read other users' data
- `prefers-reduced-motion` respected
- All images use `next/image`
- No console warnings or errors

---

## Phase 1 Completion Checklist

- [ ] Next.js app runs with `npm run dev` with no errors
- [ ] Tailwind + brand colors (green/gold/cream) + fonts loaded
- [ ] Brand feels pure, natural, and premium — look at the homepage with fresh eyes
- [ ] Logo renders crisply in header and footer
- [ ] Supabase connected, migrations applied, seed data loaded (Royal Coco brand; Bottles/Packets/Bulk categories)
- [ ] Storage buckets created
- [ ] Admin user seeded and can log in
- [ ] Register / login / Google OAuth / password reset all work
- [ ] Header, mobile menu, footer all polished
- [ ] Homepage placeholder is striking even without products
- [ ] WhatsApp floating button works (opens correct number)
- [ ] All static page skeletons exist and are branded
- [ ] RLS policies tested manually
- [ ] `.env.example` complete; README has setup instructions including migration + seed steps
- [ ] No TypeScript errors, no console errors
- [ ] Lighthouse on homepage: Performance 85+, Accessibility 95+, SEO 90+

When everything is green, you're ready for **Phase 2: Product System**.
