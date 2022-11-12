/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import http from 'http';
import { Buffer } from "buffer";
import { URL } from "url";
import { EventEmitter } from "events";
import { Socket } from "../socket";
export interface HandlerOpts {
    upstreamProxyUrlParsed: URL;
}
interface DirectOpts {
    request: http.IncomingMessage;
    sourceSocket: Socket;
    head: Buffer;
    server: EventEmitter & {
        log: (...args: any[]) => void;
    };
    handlerOpts: HandlerOpts;
}
/**
 * Client -> Apify (CONNECT) -> Upstream (SOCKS) -> Web
 * Client <- Apify (CONNECT) <- Upstream (SOCKS) <- Web
 */
export declare const tunnelSocks: ({ request, sourceSocket, head, server, handlerOpts, }: DirectOpts) => Promise<void>;
export {};
//# sourceMappingURL=tunnelSocks.d.ts.map