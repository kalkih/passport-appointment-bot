import WebSocket from "ws";
import queryString from "query-string";
import { Server } from "node:http";

export const websocket = (
  expressServer: Server
): WebSocket.Server<WebSocket.WebSocket> => {
  const websocketServer = new WebSocket.Server({
    noServer: true,
    path: "/ws",
  });

  expressServer.on("upgrade", (request, socket, head) => {
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit("connection", websocket, request);
    });
  });

  websocketServer.on(
    "connection",
    function connection(websocketConnection, connectionRequest) {
      const path = connectionRequest?.url?.split("?");
      if (path) {
        const [, params] = path;
        const connectionParams = queryString.parse(params);

        // NOTE: connectParams are not used here but good to understand how to get
        // to them if you need to pass data with the connection to identify it (e.g., a userId).
        console.log(connectionParams);
      }

      websocketConnection.on("message", (message) => {
        const parsedMessage = JSON.parse(message.toString());
        console.log(parsedMessage);
        websocketConnection.send(
          JSON.stringify({ message: "There be gold in them thar hills." })
        );
      });
    }
  );

  return websocketServer;
};
