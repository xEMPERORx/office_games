#!/bin/bash
npm run build
cp -r client/dist server/public

# Start server in background
node server/src/index.js &
SERVER_PID=$!

# Start ngrok in background
ngrok http 3000 --log=stdout > /dev/null &
NGROK_PID=$!

# Wait for ngrok to start and fetch URL
sleep 3
URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "========================================="
echo "🎮 Share this URL with your friends:"
echo ""
echo "   $URL"
echo ""
echo "========================================="
echo ""
echo "Press Ctrl+C to stop"

trap "kill $SERVER_PID $NGROK_PID 2>/dev/null; exit" INT TERM
wait
