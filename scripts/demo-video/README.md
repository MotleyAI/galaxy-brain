# Demo video

Records the demo as an MP4 (1920×1080, 30 fps): the question "What is our revenue year to date?" is typed and
asked, then each depth is pulled open, with the page's tour of each new depth, up to the deepest one. It drives the
real app in headless Chrome, draws a visible cursor, records the screen stream in real time (about 90 s) and encodes
it with ffmpeg.

```bash
uv run uvicorn --factory slayer_zoom.api:create_app   # API on :8000, replaying the recorded answers
```

```bash
cd web && npm run dev                                  # app on :5173
```

```bash
cd scripts/demo-video && npm install && npm run record -- galaxy-brain-demo.mp4
```

It needs Google Chrome (set `CHROME_PATH` elsewhere than macOS). `DEMO_URL` and `DEMO_QUESTION` change the page and
the question; the question must be one of the recorded ones unless the API runs in live mode. The browser window is
960×540 at 2× pixel density, so the answer fills the frame and text stays legible on a phone.
