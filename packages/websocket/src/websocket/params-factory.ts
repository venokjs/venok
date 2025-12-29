import type { VenokParamsFactoryInterface } from "@venok/core";

import { isFunction } from "@venok/core";

import { WsParamtype } from "~/enums/ws-paramtype.js";


export class WsParamsFactory implements VenokParamsFactoryInterface{
  public exchangeKeyForValue(
    type: number,
    data: string | undefined,
    args: [any, any, ...any, string]
  ) {
    if (!args) return null;

    switch (type as WsParamtype) {
      case WsParamtype.SOCKET: return args[0];
      case WsParamtype.PAYLOAD: return data ? args[1]?.[data] : args[1];
      case WsParamtype.ACK: return args.find(arg => isFunction(arg));
      case WsParamtype.PATTERN: return args[args.length - 1];
      default: return null;
    }
  }
}