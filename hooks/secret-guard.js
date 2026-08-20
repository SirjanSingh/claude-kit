#!/usr/bin/env node
/**
 * UserPromptSubmit hook: notice when a live credential has been pasted into the chat.
 *
 * Does NOT block, and does NOT print the secret. It appends a short instruction telling
 * the model to route the value into .env, never echo it back, and tell the user to rotate
 * it — because a key pasted into a prompt is already written to the session transcript in
 * plaintext on disk, and stays there.
 *
 * Wire it up in settings.json:
 *
 *   "hooks": {
 *     "UserPromptSubmit": [
 *       { "matcher": "",
 *         "hooks": [ { "type": "command",
 *                      "command": "node \"<path-to>/secret-guard.js\"",
 *                      "timeout": 5 } ] }
 *     ]
 *   }
 *
 * Exit 0 with stdout = that text is added to the model's context for this turn.
 * Env: SECRET_GUARD_OFF=1 disables it.
 */
'use strict';

// Shapes specific enough not to fire on ordinary prose or code.
const PATTERNS = [
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/g, 'Anthropic API key'],
  [/\bsk-proj-[A-Za-z0-9_-]{20,}/g, 'OpenAI project key'],
  [/\bsk-[A-Za-z0-9]{32,}/g, 'OpenAI-style API key'],
  [/\bAIza[0-9A-Za-z_-]{35}/g, 'Google API key'],
  [/\bAQ\.[A-Za-z0-9_-]{20,}/g, 'Google Vertex express key'],
  [/\bghp_[A-Za-z0-9]{36}/g, 'GitHub personal access token'],
  [/\bgithub_pat_[A-Za-z0-9_]{50,}/g, 'GitHub fine-grained PAT'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, 'Slack token'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AWS access key id'],
  [/\bapify_api_[A-Za-z0-9]{20,}/g, 'Apify token'],
  [/\bKGAT_[A-Za-z0-9]{20,}/g, 'Kaggle key'],
  [/\bhf_[A-Za-z0-9]{30,}/g, 'HuggingFace token'],
  [/\bsbp_[A-Za-z0-9]{36,}/g, 'Supabase access token'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, 'JWT (possibly a service-role key)'],
  [/\b[0-9a-zA-Z]{20,}_[0-9a-zA-Z]{20,}_[0-9a-zA-Z]{6,}\b/g, 'ngrok-style authtoken'],
];

// Obvious placeholders should not trigger a warning.
const PLACEHOLDER = /(your|my|example|placeholder|dummy|fake|redacted|xxx+|\.\.\.|<[a-z_-]+>)/i;

function readStdin() {
  try {
    return require('fs').readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

function main() {
  if (process.env.SECRET_GUARD_OFF === '1') return 0;

  let prompt = '';
  try {
    const payload = JSON.parse(readStdin() || '{}');
    prompt = String(payload.prompt || '');
  } catch (e) {
    return 0; // never interfere because we could not parse our own input
  }
  if (!prompt) return 0;

  const found = new Set();
  for (const [re, label] of PATTERNS) {
    const matches = prompt.match(re);
    if (!matches) continue;
    // Ignore anything that reads as a placeholder rather than a live value.
    if (matches.every((m) => PLACEHOLDER.test(m))) continue;
    found.add(label);
  }
  if (!found.size) return 0;

  process.stdout.write(
    [
      '<credential-detected>',
      `The user's message appears to contain: ${[...found].join(', ')}.`,
      '',
      'Handle it this way:',
      '1. Do NOT repeat the value anywhere - not in your reply, a commit, a log, a filename,',
      '   a URL, or a tool call argument that gets echoed back.',
      '2. Write it into the project .env (creating it if needed), confirm .env is gitignored,',
      '   and refer to it only by variable name from then on.',
      '3. Tell the user, briefly and once, that a value pasted into chat is stored in the',
      '   session transcript in plaintext on disk, so it should be rotated if it is live.',
      'Then carry on with what they actually asked for.',
      '</credential-detected>',
    ].join('\n') + '\n'
  );
  return 0;
}

process.exit(main());
