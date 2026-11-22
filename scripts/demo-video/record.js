// Records the Galaxy brain demo video: the question is typed, then each depth is pulled open up to the deepest one.
// It drives the real app in headless Chrome and records the screen stream, so the API and the web app must be
// running (see README.md). Usage: node record.js [out.mp4]
//
// Environment: DEMO_URL (default http://localhost:5173/), DEMO_QUESTION, CHROME_PATH (default: Google Chrome on
// macOS).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer-core");
const ffmpeg = require("ffmpeg-static");

const OUT = path.resolve(process.argv[2] || "galaxy-brain-demo.mp4");
const URL = process.env.DEMO_URL || "http://localhost:5173/";
const QUESTION = process.env.DEMO_QUESTION || "What is our revenue year to date?";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VIEW = { width: 960, height: 540, deviceScaleFactor: 2 }; // 1920x1080 frames, zoomed in
const FPS = 30;
const FRAMES = path.join(__dirname, "frames");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// A visible cursor: headless Chrome draws none.
const CURSOR = `
  (() => {
    const c = document.createElement('div');
    c.id = '__cursor';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.5 14 L18 14 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none',
      transform: 'translate(-100px,-100px)', transition: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.25))' });
    const ring = document.createElement('div');
    Object.assign(ring.style, { position: 'fixed', width: '34px', height: '34px', borderRadius: '50%', zIndex: 2147483646,
      pointerEvents: 'none', border: '2px solid rgba(60,91,214,.7)', opacity: '0', transform: 'translate(-100px,-100px)' });
    const add = () => { document.body.append(ring, c); };
    if (document.body) add(); else addEventListener('DOMContentLoaded', add);
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
    addEventListener('mousedown', (e) => {
      ring.style.transition = 'none'; ring.style.opacity = '1';
      ring.style.transform = 'translate(' + (e.clientX - 17) + 'px,' + (e.clientY - 17) + 'px) scale(.6)';
      requestAnimationFrame(() => { ring.style.transition = 'transform 350ms ease-out, opacity 350ms ease-out';
        ring.style.transform = 'translate(' + (e.clientX - 17) + 'px,' + (e.clientY - 17) + 'px) scale(1.3)'; ring.style.opacity = '0'; });
    }, true);
  })();
`;

async function main() {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: VIEW,
    args: ["--hide-scrollbars", "--force-color-profile=srgb", "--disable-features=Translate"],
  });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.evaluateOnNewDocument(CURSOR);
  await page.goto(URL, { waitUntil: "networkidle0" });
  // Start from an empty question box.
  await page.$eval("input[aria-label=Question]", (el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  let mouse = { x: 480, y: 420 };
  const moveTo = async (x, y, ms = 600) => {
    const from = { ...mouse };
    const steps = Math.max(2, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
      await sleep(16);
    }
    mouse = { x, y };
  };
  const center = async (selector) => {
    const box = await (await page.$(selector)).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const scrollY = () => page.evaluate(() => window.scrollY);
  const waitStill = async (minMs, stillMs = 1500, maxMs = 30000) => {
    const start = Date.now();
    await sleep(minMs);
    let last = await scrollY();
    let since = Date.now();
    while (Date.now() - start < maxMs) {
      await sleep(150);
      const now = await scrollY();
      if (Math.abs(now - last) > 1) since = Date.now();
      last = now;
      if (Date.now() - since >= stillMs) return;
    }
  };
  // Read down to the handle with the wheel, like a reader would.
  const scrollToHandle = async () => {
    for (let i = 0; i < 400; i++) {
      const box = await (await page.$(".pull-handle")).boundingBox();
      if (box.y + box.height / 2 < VIEW.height * 0.72) break;
      await page.mouse.wheel({ deltaY: 22 });
      await sleep(16);
    }
    await sleep(900);
  };
  const pull = async () => {
    const h = await center(".pull-handle");
    await moveTo(h.x, h.y - 4, 700);
    await sleep(500);
    await page.mouse.down();
    const steps = 50;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(h.x, h.y - 4 + 175 * ease(i / steps));
      await sleep(22);
    }
    await sleep(250);
    await page.mouse.up();
    mouse = { x: h.x, y: h.y + 171 };
    // Park the cursor off to the side while the page tours the new depth.
    await moveTo(VIEW.width - 40, VIEW.height * 0.55, 700);
  };

  // Record the screen stream with each frame's timestamp.
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const file = path.join(FRAMES, `${String(frames.length).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });
  await page.mouse.move(mouse.x, mouse.y);
  await sleep(1200);

  // 1. Type the question.
  const input = await center("input[aria-label=Question]");
  await moveTo(input.x - 200, input.y, 900);
  await page.mouse.click(input.x - 200, input.y);
  await sleep(350);
  for (const ch of QUESTION) {
    await page.keyboard.type(ch);
    await sleep(55 + Math.random() * 70 + (ch === " " ? 40 : 0));
  }
  await sleep(700);
  const ask = await center("form.ask button");
  await moveTo(ask.x, ask.y, 650);
  await page.mouse.click(ask.x, ask.y);
  await page.waitForSelector(".pull-handle");
  await sleep(2600);

  // 2. Pull open each depth: the page tours it, then the reader reads down to the handle again.
  const total = await page.$eval(".pull-handle", (el) => Number(el.getAttribute("aria-valuemax")));
  for (let depth = 2; depth <= total; depth++) {
    if (depth > 2) await scrollToHandle();
    await pull();
    await waitStill(2500);
    await sleep(1200);
  }

  // 3. End on the radiant brain, then back at the top of the full answer.
  await scrollToHandle();
  const h = await center(".pull-handle");
  await moveTo(h.x + 70, h.y - 10, 800);
  await sleep(2500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(2500);

  await cdp.send("Page.stopScreencast");
  await browser.close();

  // Constant 30 fps from the timestamped frames.
  const list = frames
    .map((f, i) => {
      const next = frames[i + 1];
      const d = next ? Math.max(next.t - f.t, 0.001) : 1 / FPS;
      return `file '${f.file}'\nduration ${d.toFixed(4)}`;
    })
    .join("\n");
  const concat = path.join(__dirname, "frames.txt");
  fs.writeFileSync(concat, `${list}\nfile '${frames[frames.length - 1].file}'\n`);
  execFileSync(ffmpeg, [
    "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concat,
    "-vf", `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", OUT,
  ]);
  const seconds = frames[frames.length - 1].t - frames[0].t;
  console.log(`${frames.length} frames over ${seconds.toFixed(1)} s -> ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
