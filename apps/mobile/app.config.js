const fs = require('fs');
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
  // Pas de require(app.json) : cache Node, incompatible avec les écritures EAS dans app.json.
  const appJsonPath = path.join(__dirname, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  return appJson.expo;
};
