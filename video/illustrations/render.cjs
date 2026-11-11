// Renders every illustration to a transparent PNG for the mobile app.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const out = path.join(__dirname, '../../apps/mobile/assets/illustrations');
const ids = ['auto', 'bike', 'scooter', 'cab', 'parcel', 'parcel-auto', 'hero-parcel', 'hero-login'];
const browser = process.env.REMOTION_CHROME ? [`--browser-executable=${process.env.REMOTION_CHROME}`] : [];
const cli = path.join(__dirname, '../node_modules/@remotion/cli/remotion-cli.js');

for (const id of ids) {
  const target = path.join(out, `${id}.png`);
  execFileSync(process.execPath, [cli, 'still', 'illustrations/index.jsx', id, target, '--image-format=png', '--log=error', ...browser], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  console.log('rendered', id);
}
