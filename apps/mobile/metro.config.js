const { getDefaultConfig } = require('expo/metro-config');

/**
 * Laisser Expo gérer le monorepo (watchFolders, résolution node_modules).
 * Un metro.config surchargé (extraNodeModules, etc.) peut dupliquer React avec pnpm
 * → dispatcher null / useContext dans les composants RN.
 */
module.exports = getDefaultConfig(__dirname);
