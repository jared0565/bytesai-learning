# BytesAI Learning

**A curated discovery platform for verified-free AI courses.**

Live at [learn.bytesai.uk](https://learn.bytesai.uk)

---

## What Is It?

BytesAI Learning is a discovery platform that aggregates 100+ free AI courses from the world's top providers — Google, Anthropic, Stanford, DeepLearning.AI, Microsoft, NVIDIA, and 20+ others — and surfaces them through intelligent search, personalised recommendations, and human-edited curation.

It is not a course marketplace. It is not an aggregator with a search box. The curation is the product: every course listed has been verified as genuinely free, categorised precisely, and contextualised with editorial insight so that learners can make an informed decision before they click through.

---

## Why It Was Created

The AI learning landscape is fractured. High-quality free courses exist across dozens of platforms, but finding them means navigating:

- Provider catalogues built to upsell paid tiers
- Generic course aggregators with no quality signal
- SEO-optimised lists that go stale within weeks
- No reliable answer to "is this actually free?"

BytesAI was built to solve that specific problem: give self-motivated learners — on a commute, at home, mid-career change — a single trustworthy place to find a great free AI course in under 60 seconds, without signing up for anything first.

---

## What It Does

### For Learners
- **Browse and search** 100+ verified-free courses filtered by topic, level, provider, duration, and format
- **Trending courses** ranked by real learner activity (views, starts, completions) in the past 30 days
- **AI Insights** — a curated editorial feed linking industry trends to relevant courses
- **Personalised quiz** to identify knowledge gaps and recommend a starting point
- **Save and track** progress across courses (saved → started → completed) once signed in
- **AI chatbot** powered by Google Gemini to answer "which course should I take?" questions
- **Learning paths** for structured, sequential topic progressions

### For Admins
- Full course management dashboard (create, edit, publish, archive)
- Batch import from Alison, Microsoft Learn, and custom URL ingestion
- AI-assisted article generation linked to course catalog
- Platform analytics and user engagement tracking
- Featured course rule engine (manual overrides + automatic scoring)
- Chatbot rule configuration

---

## How It Became Helpful

BytesAI addresses a real friction point in AI education: the signal-to-noise ratio. Most learners waste more time evaluating courses than actually learning. By pre-doing that work — verifying free status, checking provider credibility, assigning consistent categories and levels, writing contextual summaries — BytesAI compresses discovery time from 30 minutes to under a minute.

The platform became progressively more useful as it gained:

1. **Popularity scoring** — real engagement data (not star ratings) determines what surfaces on the homepage, creating a feedback loop where good courses get discovered more
2. **AI Insights** — editorial articles that connect what's happening in the industry (model releases, new research) to specific courses learners can take right now
3. **Chatbot** — conversational entry point for learners who don't know where to start
4. **Progress tracking** — returning learners see where they left off, not a blank slate
5. **Quiz** — removes the "I don't know what I don't know" barrier for complete beginners

---

## Sample Use Case

**Scenario:** A software engineer with Python experience wants to learn about LLMs and prompt engineering but doesn't know where to start or whether it's worth paying for a course.

1. They land on [learn.bytesai.uk](https://learn.bytesai.uk) from a search result
2. The homepage surfaces trending courses in AI/ML — they spot "Prompt Engineering for Developers" from DeepLearning.AI and Anthropic
3. The course card shows: **Free · 4 hours · Intermediate · Verified** — enough to decide without clicking through
4. They click "Take the Quiz" to confirm this is the right level — the quiz identifies their background and recommends the same course plus a follow-up on RAG
5. They sign in with Google to save both courses
6. Two weeks later they return, the dashboard shows their progress, and an AI Insights article about Claude 4 links to an updated course they haven't seen

**Result:** One trusted source replaced three hours of research. No paid courses, no dark patterns, no paywalled discovery.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Storage | Cloudflare R2 (avatars) |
| Runtime | Cloudflare Workers (via `@opennextjs/cloudflare`) |
| Auth | JWT (jose) + Google OAuth + LinkedIn OAuth |
| Email | Resend |
| AI / LLM | OpenRouter (article generation, chatbot via Gemini) |
| Scraping | Firecrawl (course discovery) |
| Bot protection | Cloudflare Turnstile |
| Styling | CSS Modules + custom properties |
| Icons | Lucide React |
| Validation | Zod |
| Build | Webpack only (Turbopack incompatible with OpenNext) |

---

## Local Development

### Prerequisites

- Node.js 20+
- A Cloudflare account with D1, KV, and R2 configured
- Wrangler CLI authenticated (`wrangler login`)

### Setup

```bash
# Install dependencies
npm install

# Bootstrap the local database (migrate + seed)
npm run db:bootstrap

# Copy and fill in environment variables
cp .env.example .env.local
```

### Required Environment Variables

```env
# Auth
JWT_SECRET=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# AI / scraping
OPENROUTER_API_KEY=
FIRECRAWL_API_KEY=

# Email
RESEND_API_KEY=

# Admin seed (first-time only)
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=

# Bot protection
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

### Running

```bash
# Development server
npm run dev

# Local Cloudflare Workers preview (full environment)
npm run preview
```

---

## Deployment

The app deploys to Cloudflare Workers via OpenNext.

```bash
# Build and deploy to production
npm run deploy
```

**Critical:** The build command must use `--webpack`. Turbopack produces chunk filenames incompatible with the OpenNext chunk loader inside Workers and will cause 500s on every route. This is enforced in `package.json` and must not be changed.

### Database Migrations

Wrangler is not available in CI. For schema changes, write the `.sql` file and run it via the Cloudflare dashboard or Cowork. For content operations (courses, articles), use the live API directly with the `BYTESAI_CLI_TOKEN` admin token — see `AGENTS.md` for curl examples.

---

## Project Structure

```
app/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/          # 56 API endpoints
│   │   ├── admin/        # Admin panel pages
│   │   ├── courses/      # Course browse and detail pages
│   │   ├── curated/      # AI Insights articles
│   │   └── dashboard/    # Authenticated learner dashboard
│   ├── components/       # React components by feature
│   └── lib/              # Business logic (auth, db, email, ranking, scanners)
├── db/
│   ├── schema.sql        # Full D1 schema
│   └── seeds/            # Provider, course, and path seed data
├── scripts/              # Build and deployment utilities
├── wrangler.toml         # Cloudflare Workers configuration
└── AGENTS.md             # Deployment rules and architecture constraints
```

---

## Design Principles

1. **The edit is the product** — curation over aggregation; every listed course is a deliberate choice
2. **Earn trust before asking** — course quality is visible before any login or click-through
3. **Native everywhere** — mobile experience designed for mobile, not a scaled-down desktop
4. **Light by default, dark by choice** — editorial clarity first, dark mode as a first-class variant
5. **Hierarchy over decoration** — no gratuitous gradients, glows, or animations

---

## License

Private repository. All rights reserved.
