import { NextResponse } from "next/server"

interface NormalizedContest {
	id: number | string
	name: string
	startTimeSeconds: number
	platform: "codeforces" | "leetcode"
	url: string
}

async function getCodeforcesContests(): Promise<NormalizedContest[]> {
	// Cache revalidation 3600 seconds (1 hour). Codeforces schedules shift slowly.
	const res = await fetch("https://codeforces.com/api/contest.list", {
		next: { revalidate: 3600 },
	})
	const data = await res.json()
	if (data.status !== "OK") return []

	return data.result
		.filter((c: { phase: string }) => c.phase === "BEFORE")
		.map((c: { id: number; name: string; startTimeSeconds: number }) => ({
			id: c.id,
			name: c.name,
			startTimeSeconds: c.startTimeSeconds,
			platform: "codeforces" as const,
			url: `https://codeforces.com/contest/${c.id}`,
		}))
}

async function getLeetcodeContests(): Promise<NormalizedContest[]> {
	const res = await fetch("https://leetcode.com/graphql", {
		method: "POST",
		headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com/" },
		body: JSON.stringify({
			operationName: "upcomingContests",
			query: `query upcomingContests { upcomingContests { title titleSlug startTime } }`,
			variables: {},
		}),
		next: { revalidate: 3600 },
	})
	const data = await res.json()
	const contests = data?.data?.upcomingContests as { title: string; titleSlug: string; startTime: number }[] | undefined
	if (!contests) return []

	return contests.map((c) => ({
		id: c.titleSlug,
		name: c.title,
		startTimeSeconds: c.startTime,
		platform: "leetcode" as const,
		url: `https://leetcode.com/contest/${c.titleSlug}`,
	}))
}

export async function GET() {
	try {
		const [codeforces, leetcode] = await Promise.all([
			getCodeforcesContests().catch(() => []),
			getLeetcodeContests().catch(() => []),
		])

		const upcoming = [...codeforces, ...leetcode]
			.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
			.slice(0, 5)

		return NextResponse.json({ status: "OK", result: upcoming })
	} catch {
		return NextResponse.json(
			{ status: "ERROR", message: "Failed to fetch contests" },
			{ status: 500 }
		)
	}
}
