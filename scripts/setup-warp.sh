#!/bin/bash
set -e

echo "==> Installing Cloudflare WARP..."

curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
sudo apt update && sudo apt install -y cloudflare-warp

echo "==> Registering WARP..."
warp-cli --accept-tos registration new

echo "==> Setting WARP to proxy mode on port 40000..."
warp-cli mode proxy
warp-cli proxy port 40000

echo "==> Connecting WARP..."
warp-cli connect

echo "==> Verifying..."
sleep 3
warp-cli status

echo "✅ WARP is running on 127.0.0.1:40000"
