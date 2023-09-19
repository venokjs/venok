import { Provider } from "@venok/core/interfaces/modules";
import { Reflector } from "@venok/core/services";
import { INQUIRER, REQUEST } from "@venok/core/constants";
import { Scope } from "@venok/core/interfaces";
import { noop } from "@venok/core/helpers/noop.helper";

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
