# 🧠 Repsheet – Track. Retain. Repeat.

Repsheet is a **Spaced Repetition tracking platform** specifically engineered for Competitive Programming and Data Structures & Algorithms. It maps the state-of-the-art **FSRS** (Free Spaced Repetition Scheduler) algorithm to your coding journey to guarantee you never forget an algorithmic pattern again.

---

## 🔥 Modern Features

Repsheet has evolved beyond a basic manual tracker into a multi-platform Analytics Hub:

- **Automated Handshake Syncing**: Connect your **LeetCode** and **Codeforces** handles to seamlessly sync your recently solved problems directly into the FSRS pipeline.
- **Incremental Polling**: Intelligently polls Codeforces and LeetCode APIs to prevent data duplication.
- **Painless Progress Tracking**: Track your current Elo rating distribution, review backlogs, and problem difficulties using dynamic heatmaps and histograms.
- **Platform Agnostic Styling**: Dynamic dashboard morphing shifts terminology and branding depending on the platform you choose to filter by (LeetCode vs Codeforces vs All).
- **Upcoming Tournaments Widget**: Live, real-time widget pulling upcoming Codeforces tournaments directly to your dashboard to trigger daily retention hooks.
- **FSRS-based Review Scheduling**: Spaced repetition algorithm to optimally space your problem reviews.
- **Secure Architecture**: Built with Next.js App Router, Prisma, MongoDB, and NextAuth (OAuth).

---

## 📈 Motivation

We started with an **Excel sheet** — just columns for problem names, links, and review dates. Manually updating review intervals became unsustainable. So we built Repsheet:

- **To automate review intervals using FSRS**
- **To sync with external platforms (Codeforces/LeetCode)**
- **To track progress effortlessly through rich data analytics**
- **To make algorithmic retention effortless**

---

## 🧱 Tech Stack

- **Frontend**: Next.js (App Router), TailwindCSS, Recharts
- **Backend**: Next.js Serverless API Routes + NextAuth.js
- **Database**: MongoDB via Prisma ORM
- **Authentication**: GitHub & Google OAuth
- **Data Layers**: Local caching + Server-side rendering pipelines
- **Deployment**: Vercel

---

## 🧪 FSRS in Action

The FSRS algorithm dynamically updates the next review date based on your rating:

- **Again** → review sooner
- **Hard** → moderate interval
- **Good** → longer interval
- **Easy** → exponential boost

This lets you focus on what you *haven’t* mastered, instead of reviewing everything blindly.

---

## 🚀 Getting Started

```bash
git clone https://github.com/ravenZ3/repsheet.git
cd repsheet
pnpm install
cp .env.example .env
# Fill in the env variables
npx prisma db push
pnpm dev
```

---

## 🛠 .env Configuration

You'll need:

```env
GITHUB_ID=your_id
GITHUB_SECRET=your_secret
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
DATABASE_URL=mongodb+srv://...
NEXTAUTH_SECRET=your_secret
```

---

## 🧾 License

MIT

---

## 🙌 Acknowledgements

- FSRS: [OpenSpacedRepetition](https://github.com/open-spaced-repetition/fsrs.js)
- Inspiration from [Anki] and countless hand-written review plans