const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'undici') {
    return {
      filePath: require.resolve('undici'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
