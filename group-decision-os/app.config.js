// Dynamic Expo config that extends app.json.
//
// Sets experiments.baseUrl from EXPO_BASE_URL at build time so the web export
// can be hosted under a sub-path (GitHub Pages serves project sites at
// /<repo>/). Left empty for local dev and root-hosted deploys (e.g. Vercel).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    baseUrl: process.env.EXPO_BASE_URL ?? '',
  },
});
