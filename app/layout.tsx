import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100`}
      >
        <AuthProvider>
          {/* Use a flex column layout to structure the page */}
          <div className="flex flex-col min-h-screen">
            {/* Navbar sits at the top */}
            <Navbar />

            {/* Main content area that can grow */}
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>

            {/* Optional: A simple footer */}
            <footer className="text-center p-4 text-sm text-gray-500 border-t border-gray-200 dark:border-gray-800">
              RepSheet © * ravenZ3 {new Date().getFullYear()}
            </footer>
          </div>
          
          {/* ThemeToggle can be positioned fixed, outside the main flow */}
          <div className="fixed bottom-5 right-5">
            <ThemeToggle />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
