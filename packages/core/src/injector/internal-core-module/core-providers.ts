import type { Provider } from "~/interfaces/index.js";

import { INQUIRER, REQUEST } from "~/constants.js";
import { Reflector } from "~/services/reflector.service.js";
import { noop } from "~/helpers/noop.helper.js";
import { Scope } from "~/enums/scope.enum.js";

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
