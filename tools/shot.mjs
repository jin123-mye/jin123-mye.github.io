// usage: node shot.mjs URL OUT.png [w] [h]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [url, out, w = 390, h = 844] = process.argv.slice(2);
const C = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const p = spawn(C, ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=/tmp/shot-chrome-profile', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) { try { const t = await (await fetch('http://127.0.0.1:9333/json')).json(); const pg = t.find(x => x.type === 'page'); if (pg) { ws = pg.webSocketDebuggerUrl; break; } } catch {} await sleep(250); }
const s = new WebSocket(ws); await new Promise(r => s.onopen = r);
let id = 0; const pend = {};
s.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; s.send(JSON.stringify({ id, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 2, mobile: true });
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(4000);
const r = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(r.data, 'base64'));
s.close(); p.kill();
