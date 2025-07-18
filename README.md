# 🧠 Repsheet – Track. Retain. Repeat.

Repsheet is a spaced repetition tool tailored for coding problem-solving. It began as a simple Excel sheet used to log and review problems and evolved into a full-stack application built with Next.js, MongoDB, Prisma, and the FSRS (Free Spaced Repetition Scheduler) algorithm.

---

##  Features

-  FSRS-based review scheduling
-  Track solved problems
-  View upcoming reviews
-  OAuth login with Google & GitHub
-  MongoDB + Prisma for database layer
-  Deployed on Vercel

---

## 📈 Motivation

We started with an **Excel sheet** — just columns for problem names, links, and review dates. Manually updating review intervals became unsustainable. So we built Repsheet:

- **To automate review intervals using FSRS**
- **To track progress painlessly**
- **To make retention effortless**

---

## 🧱 Tech Stack

- **Frontend**: Next.js (App Router)
- **Backend**: API Routes + NextAuth.js
- **Database**: MongoDB via Prisma ORM
- **Authentication**: GitHub & Google OAuth
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
git clone https://github.com/your-username/repsheet.git
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