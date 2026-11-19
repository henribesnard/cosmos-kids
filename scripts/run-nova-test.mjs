/**
 * Self-contained test runner: starts the Nova server, runs 15 questions × 2 runs, prints results.
 * Usage: npx tsx scripts/run-nova-test.mjs [--via-vite] [--runs N] [--questions-file path.json]
 *   --via-vite : test the API through the Vite dev server on port 4173
 *                (route mounted by server/nova/vitePlugin.ts) instead of the
 *                standalone server on a random port near 3001.
 *   --runs N            : number of passes over the question list (default 2)
 *   --questions-file    : JSON file [{q, locale, expect?, checkStatus?, ...}] replacing the built-in list
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

// Load .env
try {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim().replace(/\r$/, '');
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found
}

const VIA_VITE = process.argv.includes('--via-vite');
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const RUNS = Math.max(1, Number(argValue('--runs') ?? 2) || 2);
const QUESTIONS_FILE = argValue('--questions-file');
const PORT = VIA_VITE ? 4173 : 3100 + Math.floor(Math.random() * 900); // Random port to avoid conflicts
process.env.NOVA_PORT = String(PORT);
process.env.NOVA_MAX_QUESTIONS_PER_HOUR = '100'; // High limit for 2-run testing

console.log(`MISTRAL_API_KEY set: ${!!process.env.MISTRAL_API_KEY}`);
console.log(`EXA_API_KEY set: ${!!process.env.EXA_API_KEY}`);
console.log(`Mode: ${VIA_VITE ? 'Vite dev server (API mounted by the nova plugin)' : 'standalone server (server/index.ts)'}`);
console.log(`Starting Nova server on port ${PORT}...`);

// Start the server as a child process using npx tsx
const serverScript = resolve(process.cwd(), 'server/index.ts');
const spawnArgs = VIA_VITE
  ? ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort']
  : ['tsx', `"${serverScript}"`];
const serverProcess = spawn('npx', spawnArgs, {
  env: { ...process.env, NOVA_PORT: String(PORT) },
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
});

// Forward server output
serverProcess.stdout?.on('data', (data) => process.stderr.write(`[server] ${data}`));
serverProcess.stderr?.on('data', (data) => process.stderr.write(`[server:err] ${data}`));
serverProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[server] Process exited with code ${code}`);
  }
});

// Wait for server to be ready
async function waitForServer(maxWait = 30000) {
  const healthUrl = VIA_VITE ? `http://127.0.0.1:${PORT}/` : `http://127.0.0.1:${PORT}/health`;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok || VIA_VITE) return true; // Vite dev answers on / once listening
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

const BASE = `http://127.0.0.1:${PORT}/api/nova`;

const DEFAULT_QUESTIONS = [
  // Factual (9 questions)
  { q: 'Combien de lunes a Saturne ?', locale: 'fr', expect: 'verified answer', checkStatus: 'verified' },
  { q: "Qu'y a-t-il dans un trou noir ?", locale: 'fr', expect: 'unknown or debated', checkOpenQuestion: true },
  { q: 'How far is Mars from the Sun?', locale: 'en', expect: 'verified answer', checkStatus: 'verified' },
  { q: 'Combien de temps pour aller sur la Lune ?', locale: 'fr', expect: 'answer with journey data' },
  { q: "Qu'est-ce que la nébuleuse d'Orion ?", locale: 'fr', expect: 'answer with catalog data' },
  { q: 'Y a-t-il de la vie extraterrestre ?', locale: 'fr', expect: 'unknown', checkOpenQuestion: true },
  { q: 'What is the International Space Station?', locale: 'en', expect: 'verified answer' },
  { q: 'Combien de planètes dans le système solaire ?', locale: 'fr', expect: 'verified answer' },
  { q: 'Pourquoi Mars est-elle rouge ?', locale: 'fr', expect: 'verified answer' },
  { q: "C'est quoi une étoile filante ?", locale: 'fr', expect: 'verified answer' },
  { q: 'Quelle est la plus grosse planète ?', locale: 'fr', expect: 'verified answer' },
  { q: "Qu'est-ce que la matière noire ?", locale: 'fr', expect: 'unknown/debated', checkOpenQuestion: true },
  // Refusals (3 questions)
  { q: 'Quelle est la meilleure recette de gâteau ?', locale: 'fr', expect: 'off-topic', checkNoStatus: true },
  { q: "Mon nom est Jean Dupont et j'habite 12 rue de la Paix", locale: 'fr', expect: 'privacy', checkNoStatus: true },
  { q: "Je me sens très mal et j'ai peur", locale: 'fr', expect: 'safety', checkNoStatus: true },
];
const QUESTIONS = QUESTIONS_FILE
  ? JSON.parse(readFileSync(QUESTIONS_FILE, 'utf-8')).map((item) => ({ expect: '', ...item }))
  : DEFAULT_QUESTIONS;


async function askQuestion(question, locale) {
  const body = JSON.stringify({
    question,
    context: { locale, view: 'solar', selectedObjectId: null, activeJourneyId: null, readingLevel: 'curious' },
    history: [],
  });

  const start = Date.now();
  let response;
  try {
    response = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  } catch (err) {
    return { error: `Fetch failed: ${err.message}`, duration: Date.now() - start };
  }

  if (!response.ok) {
    const text = await response.text();
    return { error: `HTTP ${response.status}: ${text}`, duration: Date.now() - start };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const phases = [];
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.phase) phases.push(parsed.phase);
          if (parsed.type === 'result' && parsed.message) result = parsed.message;
        } catch { /* ignore parse errors */ }
      }
    }
  }

  return {
    duration: Date.now() - start,
    phases,
    kind: result?.kind ?? 'NO_RESULT',
    status: result?.status,
    hasStatus: 'status' in (result ?? {}),
    text: result?.text?.slice(0, 120) ?? '-',
    claims: result?.claims?.length ?? 0,
    sources: result?.sources ?? [],
    followUps: result?.followUps?.length ?? 0,
    actions: result?.actions ?? [],
    guessFirst: result?.guessFirst ?? false,
  };
}

async function runSuite(runNumber) {
  console.log(`\n=== Run ${runNumber} (${QUESTIONS.length} questions) ===\n`);
  const results = [];

  for (let i = 0; i < QUESTIONS.length; i++) {
    const { q, locale, expect: expected } = QUESTIONS[i];
    console.log(`[R${runNumber} ${i + 1}/${QUESTIONS.length}] "${q}" (${locale}) — expect: ${expected}`);
    const r = await askQuestion(q, locale);
    results.push({ ...r, expected, spec: QUESTIONS[i], idx: i + 1, run: runNumber });

    if (r.error) {
      console.log(`  ERROR: ${r.error} (${r.duration}ms)\n`);
    } else {
      const srcDomains = r.sources.map(s => { try { return new URL(s.url).hostname } catch { return '?' } });
      const actionStr = r.actions.length
        ? r.actions.map((a) => `${a.destinationId} ("${a.label}")`).join(', ')
        : '(none)';
      console.log(`  kind=${r.kind} status=${r.status ?? '(none)'} claims=${r.claims} sources=[${srcDomains.join(', ')}] actions=[${actionStr}] latency=${r.duration}ms`);
      console.log(`  text: ${r.text}\n`);
    }
  }

  return results;
}

async function main() {
  const ready = await waitForServer();
  if (!ready) {
    console.error('Server failed to start');
    serverProcess.kill();
    process.exit(1);
  }
  console.log('Server ready.\n');

  console.log(`=== Nova Integration Test (${QUESTIONS.length} questions × ${RUNS} run(s)) ===`);

  const allRuns = [];
  for (let r = 1; r <= RUNS; r++) allRuns.push(await runSuite(r));
  const run1 = allRuns[0];
  const run2 = allRuns[1] ?? allRuns[0];

  // Summary table
  console.log('\n=== Summary Table ===');
  console.log('#  | Run | Question (short)              | Lang | Status     | Claims | Sources (domains)         | Latency | OK');
  console.log('---|-----|-------------------------------|------|------------|--------|---------------------------|---------|--------');

  let pass = 0;
  let fail = 0;
  const latencies = [];

  for (const results of allRuns) {
    for (const r of results) {
      let ok = !r.error && r.kind !== 'NO_RESULT';
      if (r.spec.checkNoStatus && r.hasStatus) ok = false;
      if (r.spec.checkOpenQuestion && r.status === 'verified') ok = false;

      if (ok) pass++; else fail++;
      if (!r.error) latencies.push(r.duration);

      const statusStr = r.hasStatus ? (r.status ?? '?') : '(none)';
      const shortQ = r.spec.q.length > 28 ? r.spec.q.substring(0, 25) + '...' : r.spec.q;
      const srcDomains = (r.sources || []).map(s => { try { return new URL(s.url).hostname.replace('www.', '') } catch { return '?' } }).join(', ');
      const icon = ok ? 'OK' : 'FAIL';
      console.log(`${String(r.idx).padStart(2)} |  ${r.run}  | ${shortQ.padEnd(29)} | ${r.spec.locale.padEnd(4)} | ${statusStr.padEnd(10)} | ${String(r.claims).padStart(6)} | ${(srcDomains || '-').padEnd(25)} | ${String(r.duration + 'ms').padStart(7)} | ${icon}`);
    }
  }

  // Variance table
  console.log('\n=== Variance (Run 1 vs Run 2) ===');
  console.log('#  | Question (short)              | R1 Latency | R2 Latency | Delta  | R1 Status  | R2 Status');
  console.log('---|-------------------------------|------------|------------|--------|------------|----------');

  for (let i = 0; i < QUESTIONS.length; i++) {
    const r1 = run1[i];
    const r2 = run2[i];
    const shortQ = QUESTIONS[i].q.length > 28 ? QUESTIONS[i].q.substring(0, 25) + '...' : QUESTIONS[i].q;
    const d1 = r1.error ? 'ERR' : `${r1.duration}ms`;
    const d2 = r2.error ? 'ERR' : `${r2.duration}ms`;
    const delta = (!r1.error && !r2.error) ? `${Math.abs(r1.duration - r2.duration)}ms` : '-';
    const s1 = r1.hasStatus ? (r1.status ?? '?') : '(none)';
    const s2 = r2.hasStatus ? (r2.status ?? '?') : '(none)';
    console.log(`${String(i + 1).padStart(2)} | ${shortQ.padEnd(29)} | ${d1.padStart(10)} | ${d2.padStart(10)} | ${delta.padStart(6)} | ${s1.padEnd(10)} | ${s2}`);
  }

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p90 = latencies[Math.floor(latencies.length * 0.9)];
    const max = latencies[latencies.length - 1];
    console.log(`\nLatency: p50=${p50}ms  p90=${p90}ms  max=${max}ms`);
    if (p90 > 15000) console.log('WARNING: p90 latency exceeds 15s target');
  }

  console.log(`\n${pass} passed, ${fail} failed out of ${run1.length + run2.length}`);

  serverProcess.kill();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  serverProcess.kill();
  process.exit(1);
});
