const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure web compatibility
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
