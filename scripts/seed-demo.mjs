/**
 * Fills a demo account with a believable answer history, so the stats screen has
 * charts on camera instead of the empty state.
 *
 * The API never returns the answer key -- a question you can read the answer to
 * is not a question. So a throwaway probe account submits one letter at a time
 * until `isCorrect` comes back true, and the demo account then answers with a
 * chosen accuracy per subject.
 *
 *   node scripts/seed-demo.mjs [http://localhost:3000]
 *
 * Local API only. It signs up accounts and writes attempts.
 */
const API = process.argv[2] ?? 'http://localhost:3000';
const PASSWORD = 'demo-questiona-123';
const EMAIL = 'aroldo@questiona.test';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Accuracy per subject, picked to look like a real student rather than a coin flip. */
const PLAN = [
  { area: 'MT', count: 20, accuracy: 0.62 },
  { area: 'CH', count: 16, accuracy: 0.75 },
  { area: 'CN', count: 14, accuracy: 0.57 },
  { area: 'LC', count: 18, accuracy: 0.72 },
];

async function call(path, { body, token, method } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${method ?? 'GET'} ${path} -> ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/** Signs up, or signs in when the account is already there. */
async function account(email, name) {
  try {
    return (await call('/v1/auth/register', { body: { email, password: PASSWORD, name } })).accessToken;
  } catch {
    return (await call('/v1/auth/login', { body: { email, password: PASSWORD } })).accessToken;
  }
}

const attempt = (questionId, choice) => ({
  clientId: crypto.randomUUID(),
  questionId,
  chosen: { kind: 'mc_single', choice },
  timeMs: 32000 + Math.floor(Math.random() * 56000),
});

async function main() {
  const probe = await account(`probe-${Date.now()}@exemplo.invalid`, 'Probe');
  const demo = await account(EMAIL, 'Aroldo');

  for (const { area, count, accuracy } of PLAN) {
    const listed = await call(`/v1/questions?area=${area}&random=true&limit=${count}`);
    const questions = Array.isArray(listed) ? listed : listed.items;

    const attempts = [];
    for (const question of questions) {
      let key = null;
      for (const letter of LETTERS) {
        const { results } = await call('/v1/attempts', {
          body: { attempts: [attempt(question.id, letter)] },
          token: probe,
        });
        if (results[0].isCorrect) {
          key = letter;
          break;
        }
      }
      const wrong = LETTERS.filter((l) => l !== key);
      const choice =
        key && Math.random() < accuracy ? key : wrong[Math.floor(Math.random() * wrong.length)];
      attempts.push(attempt(question.id, choice));
    }

    await call('/v1/attempts', { body: { attempts }, token: demo });
    console.log(`  ${area}: ${attempts.length} answers`);
  }

  const stats = await call('/v1/stats/me', { token: demo });
  const { correct, total } = stats.overall;
  console.log(`\n${EMAIL} / ${PASSWORD}`);
  console.log(`${correct}/${total} = ${Math.round((100 * correct) / total)}% correct`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
