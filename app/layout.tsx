import type { Metadata } from "next";
import { Geist, Geist_Mono, Merriweather, Playfair_Display, Fira_Code, Slabo_27px } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import FloatingAddButton from "@/components/FloatingAddButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: "400",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: "700",
  style: ["normal", "italic"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const slabo = Slabo_27px({
  variable: "--font-slabo",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "RepSheet",
  description: "Spaced repetition DSA helper.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${merriweather.variable} ${playfair.variable} ${firaCode.variable} ${slabo.variable} antialiased bg-[#F4F5F7] text-gray-900 dark:bg-[#0a0a0a] dark:text-[rgba(255,255,255,0.9)]`}
      >
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
          </div>

          <div className="fixed bottom-5 right-5 z-50">
            <ThemeToggle />
          </div>

          <FloatingAddButton />
        </AuthProvider>
      </body>
    </html>
  );
}
