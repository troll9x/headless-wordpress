import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://127.0.0.1:3002/';
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'tlu-p2-cdp-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore', windowsHide: true });

let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      if (port) break;
    } catch { /* Chrome has not opened its debugging endpoint yet. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!port) throw new Error('Chrome debugging endpoint did not start.');

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find((item) => item.type === 'page');
  if (!target) throw new Error('Chrome did not create a page target.');

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const eventWaiters = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(message.error.message));
      else waiter?.resolve(message.result);
    } else if (message.method) {
      for (const waiter of eventWaiters.get(message.method) ?? []) waiter();
      eventWaiters.delete(message.method);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const waitEvent = (name, timeoutMs = 45_000) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), timeoutMs);
    const waiters = eventWaiters.get(name) ?? [];
    waiters.push(() => { clearTimeout(timeout); resolve(); });
    eventWaiters.set(name, waiters);
  });

  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__p2Lcp = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__p2Lcp.push({ startTime: entry.startTime, size: entry.size,
          url: entry.url, tag: entry.element?.tagName ?? null });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  ` });

  for (const viewport of [
    { name: 'desktop', width: 1365, height: 900, mobile: false },
    { name: 'mobile', width: 390, height: 844, mobile: true },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });
    const loaded = waitEvent('Page.loadEventFired');
    await send('Page.navigate', { url });
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const result = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        lcp: window.__p2Lcp?.at(-1) ?? null,
        banner: (() => {
          const section = document.querySelector('[aria-label="Nội dung nổi bật trang chủ"], [aria-label="Homepage highlights"]');
          if (!section) return null;
          const size = (element) => element ? ({ width: Math.round(element.getBoundingClientRect().width),
            height: Math.round(element.getBoundingClientRect().height) }) : null;
          return { section: size(section), slide: size(section.querySelector('.swiper-slide')),
            picture: size(section.querySelector('picture')), image: size(section.querySelector('img')) };
        })(),
        images: [...document.images].filter((image) => {
          const box = image.getBoundingClientRect();
          return box.top < innerHeight && box.bottom > 0;
        }).slice(0, 8).map((image) => {
          const box = image.getBoundingClientRect();
          return { src: image.currentSrc, naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight, displayedWidth: Math.round(box.width),
            displayedHeight: Math.round(box.height), priority: image.fetchPriority,
            loading: image.loading, srcsetCandidates: image.srcset ? image.srcset.split(',').length : 0,
            sizes: image.sizes };
        }),
        resources: performance.getEntriesByType('resource')
          .filter((entry) => entry.name.includes('/wp-content/uploads/'))
          .slice(0, 8).map((entry) => ({ url: entry.name, duration: Math.round(entry.duration),
            transferSize: entry.transferSize, decodedBodySize: entry.decodedBodySize }))
      }))()`,
    });
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const screenshotPath = join(profile, `${viewport.name}.png`);
    await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({ viewport: viewport.name, ...result.result.value, screenshotPath }, null, 2));
  }
} finally {
  socket?.close();
  chrome.kill();
}
