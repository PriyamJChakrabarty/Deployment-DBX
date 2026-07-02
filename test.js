import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── Env Loading (same as your Groq file) ─────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;

    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;

      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();

      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (_) {}
}

loadEnvFile(join(__dirname, '.env'));
loadEnvFile(join(__dirname, '../.env.local'));
loadEnvFile(join(__dirname, '../FullPrompt/.env'));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE = 'https://api.groq.com/openai/v1';

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found');
  process.exit(1);
}

// ── Read code.cpp ────────────────────────────────────────────────────────────
const cppPath = join(__dirname, 'code.cpp');

if (!fs.existsSync(cppPath)) {
  console.error('❌ code.cpp not found');
  process.exit(1);
}

const code = fs.readFileSync(cppPath, 'utf8');

// ── Prompt ───────────────────────────────────────────────────────────────────
const prompt = `
Analyze the following C++ code.

Find issues only under these categories:

1. Security
2. Performance
3. Scalability
4. Ethics (Bias, Privacy)
5. Maintainability

For each category:
- List every issue you find.
- Explain briefly why it is an issue.

Code:

\`\`\`cpp
${code}
\`\`\`
`;

// ── Call Groq ────────────────────────────────────────────────────────────────
async function analyze() {
  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior software engineer performing a code review.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(data);
    process.exit(1);
  }

  console.log('\n');
  console.log(data.choices?.[0]?.message?.content ?? 'No response');
  console.log('\n');

  if (data.usage) {
    console.log(
      `Tokens: ${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion`
    );
  }
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});

