import type { Observable } from "rxjs";

import type { GetParamsMetadata } from "~/interfaces/index.js";

export interface ExternalHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: GetParamsMetadata;
}

export interface ExternalContextOptions {
  guards?: boolean;
  interceptors?: boolean;
  filters?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  callback?: (result: any | Observable<any>, ...args: any[]) => void;
}
