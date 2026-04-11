import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import Link from "next/link"
import { CloverIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion"
import { MotionDiv } from "@/components/MotionWrapper"
import { AuthSection } from "@/components/AuthSection"

export default async function Home() {
	const session = await getServerSession(authOptions)
	const isAuthenticated = !!session?.user

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
			<main className="container mx-auto px-4 pt-16 pb-8">
				{/* Hero Section */}
				<section className="max-w-4xl mx-auto text-center">
					<MotionDiv
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
							Repsheet
						</h1>
						<p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
							Master coding problems with Repsheet&apos;s
							intelligent spaced repetition scheduler. Track your
							progress, review smarter, and retain problem-solving
							skills for the long term.
						</p>
					</MotionDiv>
				</section>

				{/* FSRS Information Section */}
				<section className="max-w-4xl mx-auto mt-16 mb-16 flex justify-center flex-wrap gap-4">
					<Link href="/review" passHref>
						<Button className="mx-2 flex items-center gap-2">
							<span>Start Reviewing</span>
							<CloverIcon />
						</Button>
					</Link>
					<Link href="/problems" passHref>
						<Button className="mx-2 flex items-center gap-2">
							<span>All Problems</span>
							<CloverIcon />
						</Button>
					</Link>
					<Link href="/add" passHref>
						<Button className="mx-2 flex items-center gap-2">
							<span>Add a Problem</span>
							<CloverIcon />
						</Button>
					</Link>
				</section>

				{/* Accordion Section */}
				<Accordion
					type="single"
					collapsible
					className="max-w-3xl mx-auto"
					defaultValue="item-1"
				>
					<AccordionItem value="item-1">
						<AccordionTrigger>how fsrs works</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
							<p>
								fsrs (full spaced repetition system) uses a
								memory model called dhp — it looks at
								difficulty, half-life, and recall probability to
								decide when you should review a coding problem.
							</p>

							<p>
								recall probability tracks how likely you are to
								remember something. half-life is how long that
								memory lasts. difficulty shows how tough a
								problem is for you. fsrs uses all three to plan
								your reviews.
							</p>

							<p className="bg-gray-100 dark:bg-gray-800 rounded-md p-3">
								by looking at how you&apos;ve done before and
								how long it&apos;s been, fsrs builds a study
								plan that helps you learn faster and remember
								longer.
							</p>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="item-2">
						<AccordionTrigger>
							why fsrs is better than anki
						</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
							<p>
								fsrs is smarter than anki&apos;s old sm-2
								algorithm. it doesn&apos;t use fixed intervals —
								it adapts based on how you&apos;re doing and
								when you last reviewed.
							</p>

							<p>
								it saves time, adjusts difficulty in real time,
								and targets recall goals like 90%. anki
								can&apos;t do all that with its static approach.
							</p>

							<p className="bg-gray-100 dark:bg-gray-800 rounded-md p-3">
								overall, fsrs just understands you better.
								it&apos;s faster, more efficient, and fits how
								real learning works.
							</p>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="item-3">
						<AccordionTrigger className="hover:no-underline">
							most helpful resources
						</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
							<p>
								here are some of the most useful sheets and
								lists to prep smartly for interviews or practice
								regularly:
							</p>

							<ul className="flex flex-col gap-2 pl-4 list-disc">
								<li>
									<a
										href="https://neetcode.io/"
										target="_blank"
										rel="noreferrer"
										className="text-blue-600 dark:text-blue-400 no-underline hover:no-underline"
									>
										neetcode.io – topic-wise leetcode
										roadmap
									</a>
								</li>
								<li>
									<a
										href="https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/"
										target="_blank"
										rel="noreferrer"
										className="text-blue-600 dark:text-blue-400 no-underline hover:underline"
									>
										striver&apos;s sde sheet – must-do
										coding problems
									</a>
								</li>
								<li>
									<a
										href="https://leetcode.com/list/xoqag3yj"
										target="_blank"
										rel="noreferrer"
										className="text-blue-600 dark:text-blue-400 no-underline hover:underline"
									>
										blind 75 – classic interview list
									</a>
								</li>
							</ul>

							<p className="bg-gray-100 dark:bg-gray-800 rounded-md p-3">
								combine these lists with fsrs to stay consistent
								and retain what you solve.
							</p>
						</AccordionContent>
					</AccordionItem>
				</Accordion>

				{/* Authentication Section */}
				<section className="max-w-4xl mx-auto mt-16">
					<MotionDiv
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.6 }}
						className="text-center"
					>
						<AuthSection 
							authenticated={isAuthenticated} 
							email={session?.user?.email} 
						/>
					</MotionDiv>
				</section>
			</main>
		</div>
	)
}
