"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Github, Chrome } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function Home() {
	const { data: session, status } = useSession()

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<main className="container mx-auto px-4 pt-16 pb-8 h-full flex-col justify-center items-center">
				{" "}
				{/* pt-16 to clear sticky Navbar */}
				<section className="max-w-4xl mx-auto text-center">
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
							Welcome to Repsheet
						</h1>
						<p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
							Track your coding problems, schedule reviews, and
							boost your problem-solving skills with ease.
						</p>
						{/* Features Section (placeholder) */}
						<section className="max-w-4xl mx-auto mt-100 text-center  ">
							<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
								Features
							</h2>
							<p className="text-gray-700 dark:text-gray-300 mb-6">
								Explore the powerful tools Repsheet offers.
							</p>
							{/* Add feature cards or content here */}
						</section>
						<div className="flex justify-center gap-4 bottom-0">
							{status === "authenticated" ? (
								<div>
									<p className="text-sm mb-4 text-gray-900 dark:text-gray-100">
										You are signed in as{" "}
										{session.user.email}
									</p>
									<Button
										onClick={() =>
											signOut({ callbackUrl: "/login" })
										}
										className="bg-white text-indigo-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-indigo-400 dark:hover:bg-gray-600 transition"
									>
										Sign Out
									</Button>
								</div>
							) : (
								<>
									<Button
										onClick={() => signIn("github")}
										className="bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 transition flex items-center gap-2"
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
								</>
							)}
						</div>
					</motion.div>
				</section>
			</main>
		</div>
	)
}
