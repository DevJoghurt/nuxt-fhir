import { defineWebSocketHandler} from "#imports";
import { requestContextStore, RequestContext } from '../../medplum/context';
import { getRedis, getRedisSubscriber  } from '../../medplum/redis';
import { globalLogger } from '../../medplum/logger';
import { AsyncLocalStorage } from 'async_hooks';
import { Peer } from 'crossws';
import { randomUUID } from 'crypto';
import ws from 'ws';
import { handleAgentConnection } from '../../medplum/agent/websockets';
import { handleFhircastConnection } from '../../medplum/fhircast/websocket';
import { handleR4SubscriptionConnection } from '../../medplum/subscriptions/websockets';
import { IncomingMessage } from 'http';


const handlerMap = new Map<string, (socket: ws.WebSocket, request: IncomingMessage) => Promise<void>>();
handlerMap.set('echo', handleEchoConnection);
handlerMap.set('agent', handleAgentConnection);
handlerMap.set('fhircast', handleFhircastConnection);
handlerMap.set('subscriptions-r4', handleR4SubscriptionConnection);

type WebSocketState = {
    readonly sockets: Set<Peer>;
    readonly socketsClosedPromise: Promise<void>;
    readonly socketsClosedResolve: () => void;
};
let wsState: WebSocketState | undefined = undefined;

function getWebSocketPath(path: string): string {
    return path.split('/').filter(Boolean)[1];
}

export default defineWebSocketHandler({
    async open(peer) {
        const ws = peer.ctx.node.ws as ws.WebSocket;
        const request = peer.ctx.node.req as IncomingMessage;
        if (!wsState?.sockets.size) {
            let socketsClosedResolve!: () => void;
            const socketsClosedPromise = new Promise<void>((resolve) => {
              socketsClosedResolve = resolve;
            });
            wsState = { sockets: new Set(), socketsClosedPromise, socketsClosedResolve };
        }
        wsState.sockets.add(peer);

        const path = getWebSocketPath(request.url as string);
        const handler = handlerMap.get(path);
        if (handler) {
          await requestContextStore.run(RequestContext.empty(), () => handler(ws, request));
        } else {
          ws.close();
        }
    },
  
    message(peer, message) {
      console.log("[ws] message", peer, message);
      if (message.text().includes("ping")) {
        peer.send("pong");
      }
    },
  
    close(peer, event) {
        if (!wsState) {
            return;
        }
        const { sockets, socketsClosedResolve } = wsState;
        if (sockets.size) {
            sockets.delete(peer);
            if (sockets.size === 0) {
                socketsClosedResolve();
            }
        }
    },
  
    error(peer, error) {
        globalLogger.error('WebSocket connection error', { error: error });
    },
});



/**
 * Handles a new WebSocket connection to the echo service.
 * The echo service simply echoes back whatever it receives.
 * @param socket - The WebSocket connection.
 */
async function handleEchoConnection(socket: ws.WebSocket): Promise<void> {
    // Create a redis client for this connection.
    // According to Redis documentation: http://redis.io/commands/subscribe
    // Once the client enters the subscribed state it is not supposed to issue any other commands,
    // except for additional SUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE and PUNSUBSCRIBE commands.
    const redisSubscriber = getRedisSubscriber();
    const channel = randomUUID();
  
    await redisSubscriber.subscribe(channel);
  
    redisSubscriber.on('message', (channel: string, message: string) => {
      globalLogger.debug('[WS] redis message', { channel, message });
      socket.send(message, { binary: false });
    });
  
    socket.on(
      'message',
      AsyncLocalStorage.bind(async (data: ws.RawData) => {
        await getRedis().publish(channel, data as Buffer);
      })
    );
  
    socket.on('close', () => {
      redisSubscriber.disconnect();
    });
}