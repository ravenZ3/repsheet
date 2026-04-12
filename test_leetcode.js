const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";

async function testLeetCodeSync() {
  try {
    const handle = "ravenZ3";
    console.log(`\n[+] Testing GraphQL fetch for handle: ${handle}`);

    const recentSubQuery = {
      operationName: "recentAcSubmissions",
      variables: { username: handle, limit: 3 },
      query: `query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }`
    };

    const res = await fetch(LEETCODE_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com/" },
      body: JSON.stringify(recentSubQuery),
    });

    const data = await res.json();

    if (data.errors) {
      console.error("[-] GraphQL Errors:", data.errors);
      return;
    }

    console.log("\n[+] Recent Submissions Received (Top 3):");
    console.log(data.data.recentAcSubmissionList);

    if (data.data.recentAcSubmissionList && data.data.recentAcSubmissionList.length > 0) {
        const slug = data.data.recentAcSubmissionList[0].titleSlug;
        console.log(`\n[+] Testing Background Question Details fetch for: ${slug}`);
        
        const qdQuery = {
            operationName: "questionData",
            variables: { titleSlug: slug },
            query: `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { difficulty topicTags { name } } }`
        };

        const res2 = await fetch(LEETCODE_API_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Referer": "https://leetcode.com/" },
            body: JSON.stringify(qdQuery),
        });

        const data2 = await res2.json();
        console.log(`[+] Difficulty: ${data2.data.question.difficulty}`);
        console.log(`[+] Tags: ${data2.data.question.topicTags.map(t => t.name).join(', ')}`);
        console.log("\n[+] API IS COMPLETELY FUNCTIONAL IN ISOLATION.");
    }
  } catch (err) {
    console.error("[-] Fetch Failed:", err);
  }
}

testLeetCodeSync();
