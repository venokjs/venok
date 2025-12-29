import { Reflector } from "@venok/core";
import { MESSAGE_METADATA } from "~/constants.js";

/**
 * Subscribes to messages that fulfils chosen pattern.
 *
 * @publicApi
 */
export const SubscribeMessage = Reflector.createDecorator<string>({ type: "method", key: MESSAGE_METADATA });