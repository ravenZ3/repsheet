// pages/api/leetcode.ts
// Or for App Router: app/api/leetcode/route.ts

import { NextResponse } from "next/server"

// LeetCode API endpoints
const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql"
const LEETCODE_ALL_PROBLEMS_URL = "https://leetcode.com/api/problems/all/"

// --- Caching ---
let problemMap: Map<string, string> | null = null
let lastCacheTime: number | null = null
const CACHE_DURATION = 1000 * 60 * 60 // Cache for 1 hour

interface LeetCodeProblemListItem {
	stat: {
		frontend_question_id: number
		question__title_slug: string
	}
}

async function getSlugFromId(id: string): Promise<string | null> {
	const now = Date.now()
	if (!problemMap || !lastCacheTime || now - lastCacheTime > CACHE_DURATION) {
		console.log("Fetching and caching LeetCode problem list...")
		try {
			const response = await fetch(LEETCODE_ALL_PROBLEMS_URL)
			if (!response.ok) throw new Error("Failed to fetch LeetCode problem list")
			const data = await response.json()
			const problems = data.stat_status_pairs as LeetCodeProblemListItem[]

			problemMap = new Map<string, string>()
			for (const problem of problems) {
				const frontendId = String(problem.stat.frontend_question_id)
				const slug = problem.stat.question__title_slug
				problemMap.set(frontendId, slug)
			}
			lastCacheTime = now
			console.log("Cache refreshed successfully.")
		} catch (error) {
			console.error("Error refreshing cache:", error)
		}
	}
	return problemMap?.get(id) || null
}

export async function POST(req: Request) {
	try {
		const body = await req.json()
		let { identifier } = body

		if (!identifier || typeof identifier !== "string") {
			return NextResponse.json(
				{ success: false, error: "Identifier is required in the request body" },
				{ status: 400 }
			)
		}

		identifier = identifier.trim()
		let titleSlug = ""

		if (/^\d+$/.test(identifier)) {
			// Identifier is a number. Look it up.
			const slug = await getSlugFromId(identifier)
			if (!slug) {
				return NextResponse.json(
					{
						success: false,
						error: `Could not find a LeetCode problem with ID: ${identifier}`,
					},
					{ status: 404 }
				)
			}
			titleSlug = slug
		} else {
			// --- START OF FIX ---
			// Identifier is assumed to be a slug. Sanitize it to ensure it's in the
			// correct format (e.g., "Two Sum" becomes "two-sum").
			titleSlug = identifier
				.toLowerCase() // Convert to lowercase
				.replace(/\s+/g, "-") // Replace one or more spaces with a single hyphen
				.replace(/[^a-z0-9-]/g, "") // Remove any characters that are not letters, numbers, or hyphens
			// --- END OF FIX ---
		}

		// Now, fetch the specific problem details using the sanitized titleSlug
		const query = {
			operationName: "questionData",
			variables: { titleSlug },
			query: `
                query questionData($titleSlug: String!) {
                    question(titleSlug: $titleSlug) {
                        questionId
                        questionFrontendId
                        title
                        titleSlug
                        isPaidOnly
                        difficulty
                        content
                        topicTags {
                            name
                            slug
                        }
                    }
                }
            `,
		}

		const response = await fetch(LEETCODE_API_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Referer": "https://leetcode.com/",
			},
			body: JSON.stringify(query),
		})

		if (!response.ok) {
			throw new Error(`LeetCode API responded with status ${response.status}`)
		}

		const result = await response.json()

		if (result.errors || !result.data.question) {
			return NextResponse.json(
				{ success: false, error: "Problem not found on LeetCode. Please check the slug or ID." },
				{ status: 404 }
			)
		}

		return NextResponse.json({ success: true, data: result.data.question })
	} catch (error) {
		console.error("API Error fetching LeetCode data:", error)
		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred"
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{ status: 500 }
		)
	}
}