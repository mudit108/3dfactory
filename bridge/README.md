# EMS bridge (read-only)

Runs on the factory PC. Logs in to the Surat EMS (http://localhost:8080) and serves clean JSON:
`GET http://<this-pc>:8787/api/machines`, `GET /api/health`. It never writes to the EMS.

1. Install Node.js (LTS) on the factory PC.
2. Double-click PROBE.bat first. Notepad opens: type the EMS password after EMS_PASSWORD=, save, close.
   It creates probe-output.txt (password removed). Send that file so the field mapping can be confirmed.
3. Double-click START-BRIDGE.bat to run it. Leave the window open.
4. In the 3D app folder create a .env file with VITE_EMS_API_URL=http://localhost:8787, then npm run build and npm run preview.
   Phones on the same Wi-Fi: use the PC's IP instead of localhost (e.g. http://192.168.1.20:8787), and open the app at the PC's IP too.

The top-left badge shows DEMO, LIVE or EMS OFFLINE.

## More EMS pages (yarn, beams, reports)
Double-click DISCOVER.bat. It logs in, lists the EMS menu pages and the data addresses they use, and saves discover-output.txt (password removed). Send that file.


## GRIDS (Beam / Yarn data)
Double-click `GRIDS.bat`. It reads the list pages behind Beam and Yarn (read-only) and writes `grids-output.txt`. Send that file back.
