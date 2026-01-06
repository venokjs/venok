import type { IncomingEvent, IncomingRequest, IncomingResponse } from "~/interfaces/packet.interface.js";

/**
 * @publicApi
 */
export interface Deserializer<TInput = any, TOutput = any> {
  deserialize(value: TInput, options?: Record<string, any>): TOutput | Promise<TOutput>;
}

export type ProducerDeserializer = Deserializer<any, IncomingResponse>;
export type ConsumerDeserializer = Deserializer<any, IncomingRequest | IncomingEvent>;