"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useSession } from "next-auth/react"

export default function FloatingAddButton() {
	const { status } = useSession()

	if (status !== "authenticated") return null

	return (
		<Link
			href="/add"
			className="fixed bottom-6 right-12 z-50 flex items-center justify-center w-14 h-14 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-full shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-200"
			aria-label="Add Problem"
		>
			<Plus className="w-8 h-8" />
		</Link>
	)
}
