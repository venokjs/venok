import { GATEWAY_SERVER_METADATA } from "~/constants.js";

/**
 * Attaches native Web Socket Server to a given property.
 *
 * @publicApi
 */
export const WebsocketServer = (): PropertyDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.set(target, propertyKey, null);
    Reflect.defineMetadata(GATEWAY_SERVER_METADATA, true, target, propertyKey);
  };
};