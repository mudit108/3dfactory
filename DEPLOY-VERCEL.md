# 3D factory on Vercel, with live EMS data (simple version)

Anyone with the link sees the live factory. The factory PC pushes the latest loom data to Vercel every ~4 seconds
(outbound only). If the PC/bridge is off, the badge shows EMS OFFLINE and the looms show demo data.

Already done for you on the Vercel project "3dfactory":
- VITE_EMS_CLOUD=1 and PUSH_TOKEN are set
- Vercel Authentication is turned off (so the link is public)

## You do 3 things

1. Put the new code in the project's repo and push (keep `api/`, `vercel.json`, `src/`, `package.json`).
   Or run `npx vercel --prod` in this folder.
2. Vercel > project 3dfactory > Storage > Create > Upstash Redis (free) > Connect to project. Then Redeploy once.
3. On the factory PC, open `bridge/.env` and add these two lines, then restart START-BRIDGE.bat:
```
PUSH_URL=https://3d-mudit.vercel.app/api/ems-push
PUSH_TOKEN=c3721b8409a198bd7b95361cc8339b22a1028d8b
```
(use your real site address if it is different)

## Check
Open `http://localhost:8787/api/health` on the factory PC: `push.lastOk` shows a time.
Open your Vercel link: the badge says LIVE.
