const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

/**
 * Avec pnpm + monorepo, Metro peut résoudre `react` / `react-dom` depuis plusieurs chemins
 * → deux copies dans le bundle web → « Invalid hook call » / useRef null (ErrorToastContainer).
 * On force la résolution depuis cette app uniquement.
 */
const config = getDefaultConfig(projectRoot);

const prevResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pinToApp =
    moduleName === 'react' ||
    moduleName.startsWith('react/') ||
    moduleName === 'react-dom' ||
    moduleName.startsWith('react-dom/');

  if (pinToApp) {
    try {
      const filePath = require.resolve(moduleName, { paths: [projectRoot] });
      return { type: 'sourceFile', filePath };
    } catch {
      /* laisser le résolveur par défaut */
    }
  }

  if (prevResolveRequest) {
    return prevResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
