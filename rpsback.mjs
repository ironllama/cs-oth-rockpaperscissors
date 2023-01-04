import {
    WebSocketServer
} from 'ws';

const wss = new WebSocketServer({
    port: 8333
});

wss.on('connection', function connection(ws) {
    ws.clientId = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); // Random 4 digit hex
    ws.name = ws.clientId;
    ws.opponent = null;
    ws.ready = false;

    ws.send(JSON.stringify({
        type: 'ID',
        id: ws.clientId
    }));

    ws.on('message', function message(data) {
        console.log(ws.clientId, "-", data.toString());
        let input = JSON.parse(data.toString());
        if (input.type === 'MATCH') {
            ws.opponent = "WAIT";

            for (let client of wss.clients) {
                if (ws !== client && client.readyState === ws.OPEN && client.opponent === "WAIT") {
                    client.opponent = ws;
                    ws.opponent = client;

                    ws.send(JSON.stringify({
                        type: 'MATCH',
                        opponent: client.name
                    }));
                    client.send(JSON.stringify({
                        type: 'MATCH',
                        opponent: ws.name
                    }));
                }
            }
        } else if (input.type === 'NAME') {
            ws.name = input.name;

            if (ws.opponent && ws.opponent !== "WAIT") {
                ws.opponent.send(data.toString());
            }
        } else if (input.type === 'READY') {
            ws.ready = true;

            if (ws.opponent && ws.opponent !== "WAIT" && ws.opponent.ready) {
                ws.send(JSON.stringify({
                    type: 'START'
                }));
                ws.opponent.send(JSON.stringify({
                    type: 'START'
                }));
            }
        } else if (input.type === 'MOVE') {
            if (ws.opponent && ws.opponent !== "WAIT" && ws.opponent.ready) {
                ws.opponent.send(data.toString());
            }
        }
    });
});

console.log("SERVER IS UP!");