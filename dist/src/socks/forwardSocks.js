"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forwardSocks = void 0;
const tslib_1 = require("tslib");
const http_1 = tslib_1.__importDefault(require("http"));
const stream_1 = tslib_1.__importDefault(require("stream"));
const util_1 = tslib_1.__importDefault(require("util"));
const valid_headers_only_1 = require("../utils/valid_headers_only");
const count_target_bytes_1 = require("../utils/count_target_bytes");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const pipeline = util_1.default.promisify(stream_1.default.pipeline);
/**
 * ```
 * Client -> Apify (HTTP) -> Upstream (SOCKS) -> Web
 * Client <- Apify (HTTP) <- Upstream (SOCKS) <- Web
 * ```
 */
const forwardSocks = async (request, response, handlerOpts) => new Promise(async (resolve, reject) => {
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
    const options = {
        method: request.method,
        headers: (0, valid_headers_only_1.validHeadersOnly)(request.rawHeaders),
        insecureHTTPParser: true,
        localAddress: handlerOpts.localAddress,
        agent: new socks_proxy_agent_1.SocksProxyAgent(proxy)
    };
    // only handling http here - since https is handeled by tunnelSocks
    // We have to force cast `options` because @types/node doesn't support an array.
    const client = http_1.default.request(request.url, options, async (clientResponse) => {
        try {
            // This is necessary to prevent Node.js throwing an error
            let statusCode = clientResponse.statusCode;
            if (statusCode < 100 || statusCode > 999) {
                statusCode = 502;
            }
            // 407 is handled separately
            if (clientResponse.statusCode === 407) {
                reject(new Error('407 Proxy Authentication Required'));
                return;
            }
            response.writeHead(statusCode, clientResponse.statusMessage, (0, valid_headers_only_1.validHeadersOnly)(clientResponse.rawHeaders));
            // `pipeline` automatically handles all the events and data
            await pipeline(clientResponse, response);
            resolve();
        }
        catch (error) {
            reject(error);
        }
    });
    client.once('socket', (socket) => {
        (0, count_target_bytes_1.countTargetBytes)(request.socket, socket);
    });
    try {
        // `pipeline` automatically handles all the events and data
        await pipeline(request, client);
    }
    catch (error) {
        error.proxy = proxy;
        reject(error);
    }
});
exports.forwardSocks = forwardSocks;
//# sourceMappingURL=forwardSocks.js.map