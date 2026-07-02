import "server-only";

export const fallbackChallenge = {
  title: "Merge K Sorted Lists",
  difficulty: "LeetCode Hard",
  statement: `You are given an array of k linked-lists lists, where each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.

Constraints:
- k == lists.length
- 0 <= k <= 10^4
- 0 <= lists[i].length <= 500
- -10^4 <= lists[i][j] <= 10^4
- lists[i] is sorted in ascending order
- The sum of lists[i].length will not exceed 10^4.`,
  code: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        priority_queue<int, vector<int>, greater<int>> pq;

        for (ListNode* node : lists) {
            while (node != nullptr) {
                pq.push(node->val);
                node = node->next;
            }
        }

        ListNode dummy(0);
        ListNode* tail = &dummy;

        while (!pq.empty()) {
            tail->next = new ListNode(pq.top());
            tail = tail->next;
            pq.pop()
        }

        return dummy.next;
    }
};`,
  errorLabel: "Compiler Error",
  error: `Line 27: Char 19: error: expected ';' after expression
            pq.pop()
                  ^
                  ;
1 error generated.`,
};

const systemPrompt = `You generate debugging challenges for a coding interview practice product.

Return exactly one JSON object with these string fields:
- title
- difficulty
- statement
- code
- errorLabel
- error

Rules:
- The problem must feel like a real DSA prompt, preferably LeetCode Hard.
- The code must be valid-looking C++ interview code with one intentional bug that causes a clear compiler error or runtime error.
- The error output must match the bug and look like realistic terminal/compiler output.
- Keep the statement concise but complete.
- Do not wrap the JSON in markdown fences.

NOTE:
- Double Check if the code actually has a bug that produces the error you specify - NEVER specify a correct code && NEVER make up an error that doesn't match the code. 
`;

function cleanChallenge(raw) {
  if (!raw || typeof raw !== "object") {
    return fallbackChallenge;
  }

  const challenge = {
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    difficulty:
      typeof raw.difficulty === "string" ? raw.difficulty.trim() : "",
    statement: typeof raw.statement === "string" ? raw.statement.trim() : "",
    code: typeof raw.code === "string" ? raw.code.trim() : "",
    errorLabel:
      typeof raw.errorLabel === "string" ? raw.errorLabel.trim() : "",
    error: typeof raw.error === "string" ? raw.error.trim() : "",
  };

  const hasEmptyField = Object.values(challenge).some((value) => !value);

  if (hasEmptyField) {
    return fallbackChallenge;
  }

  return challenge;
}

async function fetchGroqChallenge() {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 1200,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: "Generate a fresh debugging battle now.",
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "Groq request failed.");
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return cleanChallenge(JSON.parse(content));
}

export async function getDebugBattlePayload() {
  if (!process.env.GROQ_API_KEY) {
    return {
      challenge: fallbackChallenge,
      source: "fallback",
      message:
        "Set GROQ_API_KEY in debug-battle/.env.local to generate fresh Groq-powered challenges. A built-in sample is being shown for now.",
    };
  }

  try {
    const challenge = await fetchGroqChallenge();

    return {
      challenge,
      source: "groq",
      message: "",
    };
  } catch (error) {
    console.error("Groq challenge generation failed:", error);

    return {
      challenge: fallbackChallenge,
      source: "fallback",
      message:
        "Groq generation failed, so the app switched to a built-in challenge. Check your API key, model name, or rate limits if you expected a live response.",
    };
  }
}
