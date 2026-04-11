"use client"

import { signIn, signOut } from "next-auth/react"
import { Github, Chrome } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuthSectionProps {
	authenticated: boolean
	email?: string | null
}

export function AuthSection({ authenticated, email }: AuthSectionProps) {
	if (authenticated) {
		return (
			<div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-800">
				<p className="text-gray-700 dark:text-gray-300">
					Welcome, {email}! Start tracking your coding journey now.
				</p>
				<Button
					onClick={() => signOut()}
					className="mt-4 bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 transition"
				>
					Sign Out
				</Button>
			</div>
		)
	}

	return (
		<div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-800">
			<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
				Get Started
			</h3>
			<p className="text-gray-700 dark:text-gray-300 mb-6">
				Sign in to start tracking your coding journey
			</p>
			<div className="flex justify-center gap-4">
				<Button
					onClick={() => signIn("github")}
					className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 transition flex items-center gap-2"
				>
					<Github className="w-5 h-5" />
					<span className="text-sm font-medium">
						Sign in with GitHub
					</span>
				</Button>
				<Button
					onClick={() => signIn("google")}
					variant="outline"
					className="text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 transition flex items-center gap-2"
				>
					<Chrome className="w-5 h-5" />
					<span className="text-sm font-medium">
						Sign in with Google
					</span>
				</Button>
			</div>
		</div>
	)
}
