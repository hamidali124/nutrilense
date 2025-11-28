const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add JSON to asset extensions
config.resolver.assetExts.push('json');

// Ensure JSON files are treated as source files
config.resolver.sourceExts.push('json');

module.exports = config;
