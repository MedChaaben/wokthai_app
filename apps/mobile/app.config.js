const path = require('path');
const dotenv = require('dotenv');

// Ordre : racine monorepo puis apps/mobile (les derniers fichiers écrasent les précédents)
const envFiles = ['../../.env', '../../.env.local', '.env', '.env.local'];
for (const rel of envFiles) {
  dotenv.config({ path: path.resolve(__dirname, rel), override: true });
}

// Même fichier .env que Next : réutiliser NEXT_PUBLIC_* si EXPO_PUBLIC_* absent
if (!process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const appJson = require('./app.json');
  return appJson.expo;
};
