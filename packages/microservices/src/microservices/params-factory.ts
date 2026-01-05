import { MicroserviceParamtype } from "~/enums/microservice-paramtype.js";

export class MicroserviceParamsFactory {
  public exchangeKeyForValue(
    type: number,
    data: string | undefined,
    args: unknown[]
  ) {
    if (!args) return null;

    switch (type as MicroserviceParamtype) {
      case MicroserviceParamtype.PAYLOAD:
        // @ts-expect-error Mismatch types
        return data ? args[0]?.[data] : args[0];
      case MicroserviceParamtype.CONTEXT:
        return args[1];
      default:
        return null;
    }
  }
}