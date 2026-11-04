// Reads narration WAV durations and writes explainer/durations.json for the composition.
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, 'public/narration');
const out = {};
let total = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).sort()) {
  const b = fs.readFileSync(path.join(dir, f));
  const byteRate = b.readUInt32LE(28);
  // Find the "data" chunk; WinRT may add chunks before it.
  let i = 12;
  while (i < b.length - 8 && b.toString('ascii', i, i + 4) !== 'data') i += 8 + b.readUInt32LE(i + 4);
  const seconds = b.readUInt32LE(i + 4) / byteRate;
  out[f.replace('.wav', '')] = Math.round(seconds * 1000) / 1000;
  total += seconds;
}
fs.writeFileSync(path.join(__dirname, 'explainer/durations.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`${Object.keys(out).length} clips, ${total.toFixed(1)} s of narration; sample rate ${fs.readFileSync(path.join(dir, Object.keys(out)[0] + '.wav')).readUInt32LE(24)} Hz`);
