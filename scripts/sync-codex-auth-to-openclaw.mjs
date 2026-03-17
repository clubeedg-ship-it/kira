#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function decodeJwtPayload(token) {
  if (typeof token !== 'string' || token.split('.').length < 2) return null;
  const [, payload] = token.split('.');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
}

const home = os.homedir();
const codexAuthPath = path.join(home, '.codex', 'auth.json');
const openClawAuthPath = path.join(home, '.openclaw', 'agents', 'main', 'agent', 'auth-profiles.json');
const profileId = 'openai-codex:codex-cli';

if (!fs.existsSync(codexAuthPath)) {
  console.error(`Codex auth file not found: ${codexAuthPath}`);
  process.exit(1);
}

const codexAuth = readJson(codexAuthPath);
const tokens = codexAuth?.tokens ?? {};
const access = tokens.access_token;
const refresh = tokens.refresh_token;
const accountId = tokens.account_id;

if (!access || !refresh) {
  console.error('Codex auth file is missing access_token or refresh_token.');
  process.exit(1);
}

const accessPayload = decodeJwtPayload(access);
const idPayload = decodeJwtPayload(tokens.id_token);
const expires = typeof accessPayload?.exp === 'number' ? accessPayload.exp * 1000 : Date.now() + 6 * 60 * 60 * 1000;
const email = typeof idPayload?.email === 'string' ? idPayload.email : undefined;
const inferredAccountId =
  typeof accountId === 'string' && accountId.length > 0
    ? accountId
    : accessPayload?.['https://api.openai.com/auth']?.chatgpt_account_id;

let store = { version: 1, profiles: {}, lastGood: {}, usageStats: {} };
if (fs.existsSync(openClawAuthPath)) {
  try {
    store = readJson(openClawAuthPath);
  } catch {
    console.error(`Failed to parse existing OpenClaw auth store: ${openClawAuthPath}`);
    process.exit(1);
  }
}

store.version = Number(store.version || 1);
store.profiles = store.profiles && typeof store.profiles === 'object' ? store.profiles : {};
store.lastGood = store.lastGood && typeof store.lastGood === 'object' ? store.lastGood : {};
store.usageStats = store.usageStats && typeof store.usageStats === 'object' ? store.usageStats : {};

store.profiles[profileId] = {
  type: 'oauth',
  provider: 'openai-codex',
  access,
  refresh,
  expires,
  ...(email ? { email } : {}),
  ...(inferredAccountId ? { accountId: inferredAccountId } : {}),
};
store.lastGood['openai-codex'] = profileId;
store.usageStats[profileId] = {
  ...(store.usageStats[profileId] ?? {}),
  lastUsed: Date.now(),
  errorCount: 0,
};

ensureDir(path.dirname(openClawAuthPath));
writeJson(openClawAuthPath, store);

console.log(JSON.stringify({
  ok: true,
  source: codexAuthPath,
  target: openClawAuthPath,
  profileId,
  provider: 'openai-codex',
  expiresAt: new Date(expires).toISOString(),
  email: email ?? null,
  accountId: inferredAccountId ?? null,
}, null, 2));
