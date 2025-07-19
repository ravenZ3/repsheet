import prisma from "@/lib/prisma"; 
import ProblemsPage from "@/components/ProblemPage"; // This is your client component, path might differ

// Correct: Import tools for authentication and redirection from next-auth and next
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";


export default async function Page() {
  // --- STEP 2: Get the current user's session on the server ---
  const session = await getServerSession(authOptions);

  // --- STEP 3: Protect the page - redirect if not logged in ---
  // If there is no session or the session doesn't have our user ID,
  // the user is not authenticated. Send them to the login page.
  if (!session || !session.user?.id) {
    redirect("/login"); // Make sure '/login' is your correct sign-in page route
  }

  // --- STEP 4: Fetch problems ONLY for the logged-in user ---
  // We use the user's ID from the session to filter the database query.
  const problems = await prisma.problem.findMany({
    where: {
      userId: session.user.id, // <-- THE SECURITY FIX IS HERE
    },
    orderBy: {
      dateSolved: "desc", // Or any other order you prefer
    },
  });

  // Now, the `problems` variable can be safely passed to your client component.
  // It only contains data that belongs to the currently logged-in user.
  return <ProblemsPage initialProblems={problems} />;
}