import { NextResponse } from "next/server"

export async function GET() {
	try {
        // Cache revalidation 3600 seconds (1 hour). Codeforces schedules shift slowly.
		const res = await fetch("https://codeforces.com/api/contest.list", {
			next: { revalidate: 3600 },
		})
		const data = await res.json()

		if (data.status === "OK") {
			const upcoming = data.result
				.filter((c: any) => c.phase === "BEFORE")
				.sort((a: any, b: any) => a.startTimeSeconds - b.startTimeSeconds)
				.slice(0, 5)
			return NextResponse.json({ status: "OK", result: upcoming })
		}
		return NextResponse.json({ status: "FAILED" }, { status: 500 })
	} catch (error) {
		return NextResponse.json(
			{ status: "ERROR", message: "Failed to fetch contests" },
			{ status: 500 }
		)
	}
}
