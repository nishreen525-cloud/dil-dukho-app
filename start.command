#!/bin/bash
cd "$(dirname "$0")" || exit 1
echo "Starting Dil Dukho at http://127.0.0.1:8123"
python3 -m http.server 8123
