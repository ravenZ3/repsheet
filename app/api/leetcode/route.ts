// app/api/leetcode/route.ts
// This file acts as a server-side proxy to bypass CORS restrictions when fetching from LeetCode.
// This structure is for Next.js 13+ App Router.

import { NextResponse } from 'next/server';

// Define the expected structure of the LeetCode problem data
interface LeetCodeProblem {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  topicTags: Array<{ name: string }>;
  content: string;
}

// Define the response structure for our API
interface ApiResponse {
  success: boolean;
  data?: LeetCodeProblem;
  error?: string;
}

// Export a named POST function for the App Router API route
export async function POST(req: Request) {
  // Extract the titleSlug from the request body
  // In App Router, req.json() is used to parse the JSON body
  let body;
  try {
    body = await req.json();
  } catch (e) {
    // If the request body is not valid JSON
    console.error('Failed to parse request body as JSON:', e);
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const { titleSlug } = body;

  // Validate the presence of titleSlug
  if (!titleSlug || typeof titleSlug !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid titleSlug in request body' },
      { status: 400 }
    );
  }

  // Check if the titleSlug looks like a numeric ID.
  // LeetCode's GraphQL 'question' query only accepts string slugs (e.g., "two-sum"), not numeric frontend IDs (e.g., "1").
  // This check ensures we provide a specific error message for numeric inputs.
  if (!isNaN(Number(titleSlug)) && Number(titleSlug).toString() === titleSlug) {
    return NextResponse.json(
      {
        success: false,
        error: 'Numeric LeetCode problem IDs (e.g., "1") are not directly supported by auto-fill. Please enter the problem\'s slug (e.g., "two-sum") or its full URL.',
      },
      { status: 400 }
    );
  }

  // GraphQL query to fetch LeetCode problem details
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags {
          name
        }
        content
      }
    }
  `;

  try {
    // Make the request to LeetCode's GraphQL API from the Next.js server
    const leetCodeResponse = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com', // Good practice to include
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug },
      }),
    });

    // Check if the response from LeetCode was successful (HTTP status 2xx)
    if (!leetCodeResponse.ok) {
      const errorText = await leetCodeResponse.text(); // Get raw error from LeetCode
      console.error(`LeetCode API returned ${leetCodeResponse.status}: ${errorText}`);
      return NextResponse.json(
        {
          success: false,
          error: `LeetCode API error: ${leetCodeResponse.status} - ${errorText.substring(0, 100)}...`,
        },
        { status: leetCodeResponse.status } // Pass through LeetCode's status
      );
    }

    const data = await leetCodeResponse.json();

    // Handle GraphQL errors returned in the data payload (even if HTTP status was 200)
    if (data.errors) {
      console.error('GraphQL errors from LeetCode:', data.errors);
      return NextResponse.json(
        {
          success: false,
          error: data.errors[0]?.message || 'GraphQL error from LeetCode',
        },
        { status: 400 } // Bad request for GraphQL errors
      );
    }

    // Check if the problem data exists (i.e., if the question was found)
    if (!data.data?.question) {
      // This means the slug was valid but the problem wasn't found (e.g., typo in slug)
      return NextResponse.json(
        { success: false, error: 'Problem not found on LeetCode. Please check the slug or URL.' },
        { status: 404 }
      );
    }

    // Return the fetched problem data
    return NextResponse.json({ success: true, data: data.data.question }, { status: 200 });

  } catch (error) {
    console.error('Error fetching problem details from LeetCode:', error);
    // Generic error for unexpected issues during the fetch operation
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

// If you need to handle other methods (GET, PUT, DELETE), you would export them similarly:
// export async function GET(req: Request) { ... }
// export async function PUT(req: Request) { ... }
// export async function DELETE(req: Request) { ... }
// If no other methods are exported, any request with a method other than POST will automatically receive a 405.
