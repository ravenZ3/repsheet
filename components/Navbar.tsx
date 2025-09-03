'use client'; // This directive is essential for using client-side hooks

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import {  Loader2,  MenuIcon, X } from 'lucide-react'; // Import Menu and X icons
import rehypeHighlight from "rehype-highlight"
export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State to manage the mobile menu

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const linkClass = (path: string) =>
    `block px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
      pathname === path
        ? 'font-semibold text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800'
        : 'text-gray-600 dark:text-gray-300'
    }`;

  const mobileLinkClass = (path: string) =>
    `w-full text-left px-4 py-3 rounded-md text-base transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
      pathname === path
        ? 'font-bold text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800'
        : 'text-gray-700 dark:text-gray-300'
    }`;

  return (
    <nav className="bg-white dark:bg-black/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex justify-between items-center px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          RepSheet
        </Link>
        
        {/* Mobile menu button, visible only on smaller screens */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="p-2 text-gray-700 dark:text-gray-300 focus:outline-none">
            {isMenuOpen ? <X size={27} /> : <MenuIcon size={24} />}
          </button>
        </div>

        {/* Desktop menu, visible only on medium screens and larger */}
        <div className="hidden md:flex items-center gap-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center w-20">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          )}

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

          {status === 'unauthenticated' && (
            <button
              onClick={() => signIn()}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile-only collapsible menu */}
      {isMenuOpen && (
        <div className="md:hidden z-2 flex flex-col h-[100vh] items-start  px-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-800">
          {status === 'loading' && (
            <div className="w-full py-4 text-center">
              <Loader2 className="mx-auto w-6 h-6 animate-spin text-gray-500" />
            </div>
          )}
          
          {status === 'authenticated' && (
            <>
              <Link href="/dashboard" onClick={toggleMenu} className={mobileLinkClass('/dashboard')}>Dashboard</Link>
              <Link href="/problems" onClick={toggleMenu} className={mobileLinkClass('/problems')}>All Problems</Link>
              <Link href="/review" onClick={toggleMenu} className={mobileLinkClass('/review')}>Review</Link>
              <Link href="/add" onClick={toggleMenu} className={mobileLinkClass('/add')}>Add</Link>
              <button
                onClick={() => {
                  toggleMenu();
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full text-left px-4 py-3 text-base font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </>
          )}

          {status === 'unauthenticated' && (
            <button
              onClick={() => {
                toggleMenu();
                signIn();
              }}
              className="w-full text-left px-4 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      )}
    </nav>
  );
}