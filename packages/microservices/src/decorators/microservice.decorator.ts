import type { ScopeOptions } from "@venok/core";

import { Reflector, Scope, SCOPE_OPTIONS_METADATA } from "@venok/core";


// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MicroserviceOptions extends ScopeOptions {}

type MicroserviceDecorator = {
  [SCOPE_OPTIONS_METADATA]: { scope: Scope | undefined; durable: boolean | undefined; } | undefined,
};

export const Microservice = Reflector.createMetadataDecorator<MicroserviceOptions, MicroserviceDecorator>({ 
  type: "class",
  transform(options) {
    const scope = { scope: options?.scope || Scope.DEFAULT, durable: options?.durable || false };
    return { [SCOPE_OPTIONS_METADATA]: scope };
  },
});