'use client'; // This directive is essential for using client-side hooks

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react'; // Import NextAuth hooks
import { Loader2 } from 'lucide-react'; // A nice loading spinner icon

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  // 'status' can be 'loading', 'authenticated', or 'unauthenticated'

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
      pathname === path
        ? 'font-semibold text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800'
        : 'text-gray-600 dark:text-gray-300'
    }`;

  return (
    <nav className="bg-white dark:bg-black/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex justify-between items-center px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          📘 RepSheet
        </Link>
        
        <div className="flex items-center gap-4">
          {/* --- DYNAMIC AUTHENTICATION UI --- */}

          {/* 1. While the session is loading, show a spinner */}
          {status === 'loading' && (
            <div className="flex items-center justify-center w-20">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          )}

          {/* 2. If the user is authenticated, show the app links and a Sign Out button */}
          {status === 'authenticated' && (
            <>
              <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
              <Link href="/problems" className={linkClass('/problems')}>All Problems</Link>
              <Link href="/review" className={linkClass('/review')}>Review</Link>
              <Link href="/add" className={linkClass('/add')}>Add</Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </>
          )}

          {/* 3. If the user is not logged in, show a Sign In button */}
          {status === 'unauthenticated' && (
            <button
              onClick={() => signIn()} // This redirects to your login page
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}