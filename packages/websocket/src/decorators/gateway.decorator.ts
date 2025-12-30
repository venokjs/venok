import type { WebsocketGatewayDiscoveryMeta } from "~/helpers/discovery.helper.js";
import type { GatewayDefaultOptions } from "~/interfaces/index.js";

import { Reflector } from "@venok/core";

import { WebsocketGatewayDiscovery } from "~/helpers/discovery.helper.js";
import { GATEWAY_METADATA, GATEWAY_OPTIONS, PORT_METADATA } from "~/constants.js";
import { InvalidSocketPortException } from "~/errors/invalid-socket-port.exception.js";

const internalGateway = Reflector.createDecorator<WebsocketGatewayDiscoveryMeta, WebsocketGatewayDiscovery>({
  type: "class",
  key: GATEWAY_METADATA,
  transform: (options) => {
    return new WebsocketGatewayDiscovery(options);
  },
});

/**
 * Decorator that marks a class as a Nest gateway that enables real-time, bidirectional
 * and event-based communication between the browser and the server.
 *
 * @publicApi
 */
export function WebSocketGateway(port?: number): ClassDecorator;
export function WebSocketGateway<T extends GatewayDefaultOptions = GatewayDefaultOptions>(options?: T): ClassDecorator;
export function WebSocketGateway<T extends GatewayDefaultOptions = GatewayDefaultOptions>(port?: number, options?: T): ClassDecorator;
// eslint-disable-next-line @stylistic/max-len
export function WebSocketGateway<T extends GatewayDefaultOptions = GatewayDefaultOptions>(portOrOptions?: number | T, options?: T): ClassDecorator {
  const isPortInt = Number.isInteger(portOrOptions as number);

  const port = isPortInt ? portOrOptions as number : 0;
  const gatewayOptions = isPortInt ? (options || {}) as T : (portOrOptions || {}) as T;

  return internalGateway({
    [PORT_METADATA]: port,
    [GATEWAY_OPTIONS]: gatewayOptions,
  });
}

WebSocketGateway["KEY"] = internalGateway.KEY;
