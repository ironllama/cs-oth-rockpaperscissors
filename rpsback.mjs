import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8333 });

wss.on('connection', function (ws) {
  console.log("NEW CLIENT");

  // Custom client properties.
  ws.clientId = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);  // Random 4 digit hex.
  ws.name = ws.clientId;
  ws.opponent = null;
  ws.ready = false;
  ws.move = null;

  // For keepalives.
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  // Send the new client the generated ID...
  ws.send(JSON.stringify({ type: 'ID', id: ws.clientId }));

  console.log("Clients: ", [...wss.clients].map(i => i.clientId).join(", "));

  // Handle any messages from this client.
  ws.on('message', function message(data, isBinary) {
    // const newMessage = JSON.stringify([running_num, last_msg_date]);
    if (data.isBinary) {
      console.log(ws.clientId, "- binary data");
    }
    else {
      console.log(ws.clientId, "-", data.toString());
      try {
        let input = JSON.parse(data.toString());

        // Not yet matched. Looking for opponent.
        if (input.type === 'MATCH') {
          ws.opponent = "WAIT";  // Means we're waiting to be matched.

          // Look for someone else also in the WAIT state.
          for (let client of wss.clients) {
            if (ws !== client && client.isAlive && client.readyState === WebSocket.OPEN && client.opponent === "WAIT") {
              client.opponent = ws;
              ws.opponent = client;

              ws.send(JSON.stringify({ type: 'MATCH', opponent: client.name }));
              client.send(JSON.stringify({ type: 'MATCH', opponent: ws.name }));
              break;
            }
          }
        }
        // Already matched, ready for next turn.
        else if (input.type === 'READY') {
          if (ws.opponent) {
            ws.ready = true;
            ws.opponent.send(JSON.stringify({ type: 'READY' }));

            if (ws.ready && ws.opponent.ready) {
              ws.move = null;
              ws.opponent.move = null;
              ws.send(JSON.stringify({ type: 'START' }));
              ws.opponent.send(JSON.stringify({ type: 'START' }));
            }
          }
        }
        // Already matched, next move.
        else if (input.type === 'MOVE') {
          ws.move = data.toString();

          // if (ws.opponent) {
          //   ws.opponent.send(data.toString());  // Skip reparsing, if possible.
          //   ws.ready = false;
          // }

          if (ws.opponent && ws.move && ws.opponent.move) {
            ws.opponent.send(data.toString());  // Skip reparsing, if possible.
            ws.send(ws.opponent.move);
            // ws.send(JSON.stringify({ type: 'START' }));
            // ws.opponent.send(JSON.stringify({ type: 'START' }));
            ws.ready = false;
            ws.opponent.ready = false;
          }
        }
        else if (input.type === 'NAME') {
          ws.name = input.name;

          if (ws.opponent) {
            ws.opponent.send(data.toString());  // Skip reparsing, if possible.
          }
        }
      } catch (err) {
        console.error("Ooooo... yeeeah... no. err >>>", err);
      }
    }
  });
});

// Source: https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
function heartbeat() { this.isAlive = true; }

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

console.log("SERVER UP");