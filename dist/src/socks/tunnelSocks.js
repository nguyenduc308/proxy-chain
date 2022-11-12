"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tunnelSocks = void 0;
const url_1 = require("url");
const count_target_bytes_1 = require("../utils/count_target_bytes");
const socks_1 = require("socks");
/**
 * Client -> Apify (CONNECT) -> Upstream (SOCKS) -> Web
 * Client <- Apify (CONNECT) <- Upstream (SOCKS) <- Web
 */
const tunnelSocks = async ({ request, sourceSocket, head, server, handlerOpts, }) => {
    const { hostname, port, username, password } = handlerOpts.upstreamProxyUrlParsed;
    const proxy = {
        host: hostname,
        port: Number(port),
        type: 4,
    };
    if (username || password) {
        proxy.type = 5;
        proxy.userId = username;
        proxy.password = password;
    }
    const url = new url_1.URL(`connect://${request.url}`);
    if (!url.hostname) {
        throw new Error("Missing CONNECT hostname");
    }
    if (!url.port) {
        console.log(url);
        throw new Error("Missing CONNECT port");
    }
    if (head.length > 0) {
        throw new Error(`Unexpected data on CONNECT: ${head.length} bytes`);
    }
    const destination = {
        port: Number(url.port),
        host: url.hostname,
    };
    if (destination.host[0] === "[") {
        destination.host = destination.host.slice(1, -1);
    }
    let targetSocket;
    try {
        const client = await socks_1.SocksClient.createConnection({
            proxy,
            command: "connect",
            destination,
        });
        targetSocket = client.socket;
        sourceSocket.write(`HTTP/1.1 200 Connection Established\r\n\r\n`);
    }
    catch (error) {
        sourceSocket.destroy(error);
        throw error;
    }
    (0, count_target_bytes_1.countTargetBytes)(sourceSocket, targetSocket);
    sourceSocket.pipe(targetSocket);
    targetSocket.pipe(sourceSocket);
    // Once target socket closes forcibly, the source socket gets paused.
    // We need to enable flowing, otherwise the socket would remain open indefinitely.
    // Nothing would consume the data, we just want to close the socket.
    targetSocket.on("close", () => {
        sourceSocket.resume();
        if (sourceSocket.writable) {
            sourceSocket.end();
        }
    });
    // Same here.
    sourceSocket.on("close", () => {
        targetSocket.resume();
        if (targetSocket.writable) {
            targetSocket.end();
        }
    });
    const { proxyChainId } = sourceSocket;
    targetSocket.on("error", (error) => {
        server.log(proxyChainId, `Direct Destination Socket Error: ${error.stack}`);
        sourceSocket.destroy();
    });
    sourceSocket.on("error", (error) => {
        server.log(proxyChainId, `Direct Source Socket Error: ${error.stack}`);
        targetSocket.destroy();
    });
};
exports.tunnelSocks = tunnelSocks;
//# sourceMappingURL=tunnelSocks.js.map