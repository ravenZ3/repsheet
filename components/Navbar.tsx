'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
	const pathname = usePathname()

	const linkClass = (path: string) =>
		`px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
			pathname === path ? 'font-semibold text-blue-600' : ''
		}`

	return (
		<nav className="bg-white dark:bg-gray-900 shadow px-4 py-3 sticky top-0 z-50">
			<div className="max-w-4xl mx-auto flex justify-between items-center">
				<Link href="/" className="text-lg font-bold">
					📘 RepSheet
				</Link>
				<div className="flex gap-4">
					<Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
                    <Link href="/problems" className={linkClass('/problems')}>All Problems</Link>
					<Link href="/review" className={linkClass('/review')}>Review</Link>
					<Link href="/add" className={linkClass('/add')}>Add</Link>
				</div>
			</div>
		</nav>
	)
}
