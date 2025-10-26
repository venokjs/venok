import { RouteParamtypes } from "../enums/index.js";
import type { VenokParamsFactoryInterface } from "@venok/core";

export class RouteParamsFactory implements VenokParamsFactoryInterface<RouteParamtypes> {
  public exchangeKeyForValue<TRequest extends Record<string, any> = any, TResponse = any, TResult = any>(
    key: RouteParamtypes | string,
    data: string | object | any,
    args: [TRequest, TResponse, Function],
  ): TResult {
    const [req, res, next] = args;
    switch (key) {
      case RouteParamtypes.NEXT:
        return next as any;
      case RouteParamtypes.REQUEST:
        return req as any;
      case RouteParamtypes.RESPONSE:
        return res as any;
      case RouteParamtypes.BODY:
        return data && req.body ? req.body[data] : req.body;
      case RouteParamtypes.PARAM:
        return data ? req.params[data] : req.params;
      case RouteParamtypes.HOST:
        const hosts = req.hosts || {};
        return data ? hosts[data] : hosts;
      case RouteParamtypes.QUERY:
        return data ? req.query[data] : req.query;
      case RouteParamtypes.HEADERS:
        return data ? req.headers[data.toLowerCase()] : req.headers;
      case RouteParamtypes.SESSION:
        return req.session;
      case RouteParamtypes.FILE:
        return req[data || "file"];
      case RouteParamtypes.FILES:
        return req.files;
      case RouteParamtypes.IP:
        return req.ip;
      default:
        return null as any;
    }
  }
}
