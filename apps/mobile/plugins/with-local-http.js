// Release builds block plain http. A phone testing against the local dev backend
// (`adb reverse tcp:54321 tcp:54321`, then http://localhost:54321) needs it, so allow it only
// when THOZHAN_LOCAL_TEST_BUILD=1 is set at build time. Store builds never set it.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withLocalHttp(config) {
  if (process.env.THOZHAN_LOCAL_TEST_BUILD !== '1') return config;
  return withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application?.[0];
    if (app) app.$['android:usesCleartextTraffic'] = 'true';
    return c;
  });
};
