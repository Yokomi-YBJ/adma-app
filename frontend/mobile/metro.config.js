const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Transpiler MapLibre et ses dépendances (sources TS non compilées)
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(?:.pnpm/)?(' +
    '(jest-)?react-native' +
    '|@react-native(-community)?' +
    '|expo(nent)?' +
    '|@expo(nent)?/.*' +
    '|@expo-google-fonts/.*' +
    '|react-navigation' +
    '|@react-navigation/.*' +
    '|@unimodules/.*' +
    '|unimodules' +
    '|sentry-expo' +
    '|native-base' +
    '|react-native-svg' +
    '|react-native-reanimated' +
    '|react-native-gesture-handler' +
    '|react-native-safe-area-context' +
    '|react-native-screens' +
    '|@maplibre/.*' +
  '))',
];

config.resolver.sourceExts = Array.from(
  new Set([...config.resolver.sourceExts, 'ts', 'tsx'])
);

module.exports = config;