# Invoice-Validation-Tool
Tax Invoice Validation Tool

## Start on Windows

Run `run_all.bat` to start the backend and frontend. On the host computer, open
`http://localhost:3000`. To use the app from another phone or computer on the
same Wi-Fi/LAN, open the **Network** URL printed in the Vite frontend window
(it uses the host computer's LAN IP address).

If another device cannot connect, allow inbound TCP port `3000` for the
**Private** network profile in Windows Firewall, and make sure both devices are
on the same network. The API is proxied through the frontend; direct API access
is not needed for normal app use.

This enables local-network access only. Access over the public internet requires
deploying the app to a server or setting up a secure tunnel; do not expose the
development server directly to the internet.
