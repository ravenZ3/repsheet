import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Repsheet",
  description: "How the Repsheet website and browser extension handle your data.",
};

const UPDATED = "June 29, 2026";
const CONTACT = "ramjanestfern@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: {UPDATED}</p>

        <p className="mt-8 leading-relaxed">
          Repsheet is a spaced-repetition tracker for competitive programming. This policy
          covers both the Repsheet website and the Repsheet browser extension for Chrome and
          Firefox.
        </p>

        <Section title="What the extension accesses">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Your Repsheet session cookie.</strong> The extension reads your existing
              login cookie for <code>repsheet.vercel.app</code> so it can authenticate API
              requests on your behalf. You log in once on the website; the extension never asks
              for your password and runs no separate login.
            </li>
            <li>
              <strong>Problem details on the page you are viewing.</strong> On LeetCode and
              Codeforces problem pages, the extension reads the problem name, URL, difficulty,
              and tags, and detects when a submission is accepted.
            </li>
          </ul>
        </Section>

        <Section title="What it sends and stores">
          <p className="leading-relaxed">
            When you rate a solved problem, the extension sends that problem&apos;s details and
            your rating to the Repsheet backend (<code>repsheet.vercel.app</code>), which stores
            them in your account — the same data the website already saves. The extension keeps
            no separate database of its own and stores nothing beyond minimal local settings in
            the browser.
          </p>
        </Section>

        <Section title="What it does not do">
          <ul className="list-disc space-y-2 pl-5">
            <li>No third-party analytics, advertising, or tracking.</li>
            <li>No selling or sharing of your data with anyone.</li>
            <li>No reading of pages other than LeetCode and Codeforces problem pages.</li>
            <li>No collection of keystrokes, form input, or browsing history.</li>
          </ul>
        </Section>

        <Section title="Data retention and deletion">
          <p className="leading-relaxed">
            Your problem and review data lives in your Repsheet account and is removed when you
            delete the account. Uninstalling the extension stops all access immediately.
          </p>
        </Section>

        <Section title="Contact">
          <p className="leading-relaxed">
            Questions about this policy? Email{" "}
            <a className="text-purple-500 hover:underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 text-gray-700 dark:text-gray-300">{children}</div>
    </section>
  );
}
