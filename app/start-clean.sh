#!/bin/bash
# Start kira-app with OPENCLAW env vars stripped so gateway doesn't reject requests
unset OPENCLAW_SERVICE_MARKER
unset OPENCLAW_SERVICE_KIND
unset OPENCLAW_PATH_BOOTSTRAPPED
unset OPENCLAW_SYSTEMD_UNIT
unset MEMORY_PRESSURE_WATCH
cd /home/adminuser/kira/app
exec npx tsx src/server/index-single.ts
