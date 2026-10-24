# Second Hands

**An AI that watches your hands while you repair something, and stops you before you make a mistake.**

Mount a phone 15–20 cm above your bench. Second Hands finds the real repair guide on the web, turns it into steps a camera can check, watches each step through the phone camera, and speaks up only when it matters: "Stop. Disconnect the battery connector first."

Built for the Nebius x NVIDIA Global AI Hackathon (Physical AI track).

> 🚧 Work in progress. Full docs, demo link and video coming before submission.

## How it works

| Stage | Model / service | Job |
|---|---|---|
| Find the guide | **Tavily** search + extract | Fetches a real repair guide at runtime |
| Plan | **Nemotron 3 Super 120B** (Token Factory) | Turns the guide into camera-checkable steps |
| Watch | **Nemotron 3.5 Super VL** (Token Factory) | Checks each frame against the current step |
| Decide | **Nemotron 3 Nano 30B** (Token Factory) | Speak or stay quiet; writes the spoken line |
| Verify | **Nemotron 3 Ultra 550B** (Token Factory) | Double-checks the evidence before any "stop" |

A mistake must show in 2 of the last 3 frames before anything is said. Every model call is shown in an agent trace with latency, tokens and cost.

## Run locally

```bash
pnpm install
cp .env.example .env.local   # leave keys empty to run in mock mode
pnpm dev                     # http://localhost:3000
```

Testing with a phone on the same Wi-Fi (the camera needs HTTPS):

```bash
pnpm dev:https               # then open https://<your-LAN-IP>:3000 on the phone
```

`pnpm test` runs the unit tests.

## License

MIT
