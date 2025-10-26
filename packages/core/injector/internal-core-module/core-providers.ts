import type { Provider } from "@venok/core/interfaces/modules/index.js";
import { Reflector } from "@venok/core/services/index.js";
import { INQUIRER, REQUEST } from "@venok/core/constants.js";
import { Scope } from "@venok/core/interfaces/index.js";
import { noop } from "@venok/core/helpers/noop.helper.js";

export const ReflectorAliasProvider: Provider = {
  provide: Reflector.name,
  useExisting: Reflector,
};

export const requestProvider: Provider = {
  provide: REQUEST,
  scope: Scope.REQUEST,
  useFactory: noop,
};

export const inquirerProvider: Provider = {
  provide: INQUIRER,
  scope: Scope.TRANSIENT,
  useFactory: noop,
};
