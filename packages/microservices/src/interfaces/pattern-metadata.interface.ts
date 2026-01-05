import type { Transport } from "~/interfaces/transport.interface.js";

export type MicroserviceFundamentalPattern = string | number;

export interface MicroserviceObjectPattern {
  [key: string]: MicroserviceFundamentalPattern | MicroserviceObjectPattern;
}

export type MicroservicePattern = MicroserviceObjectPattern | MicroserviceFundamentalPattern;

export interface MicroservicePatternHandlerMetadata {
  patterns: MicroservicePattern[];
  methodKey: string;
  isEventHandler: boolean;
  transport?: Transport;
  extras?: Record<string, any>;
}

export interface MicroserviceHandlersMetadata {
  handlers: {
    pattern: MicroservicePattern;
    isEventHandler: boolean;
    callback: Function;
    extras?: Record<string, any>;
  }[]
}