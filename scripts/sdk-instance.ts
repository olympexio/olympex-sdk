import 'dotenv/config';

import { initialize } from '../src/config/initialize.js';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const client = initialize({
  apiKey: requireEnv('OLYMPEX_API_KEY'),
  apiSecret: requireEnv('OLYMPEX_API_SECRET'),
  passphrase: requireEnv('OLYMPEX_PASSPHRASE'),
});

console.log('SDK client initialized:', {
  apiKey: client.apiKey,
  backendUrl: process.env.OLYMPEX_BACKEND_URL?.trim() || '(default production)',
});

const main = async () => {
  const version = client.getVersion();

  console.log('SDK version:', version);

  console.time('Support chain:');
  const supportChain = await client.supportChain(137);
  console.log('Support chain:', supportChain);
  console.timeEnd('Support chain:');
};

main().catch((error) => {
  console.error('Error in main:', error);
});
