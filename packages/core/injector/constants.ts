import type { ContextId } from "@venok/core/injector/instance/wrapper.js";

const STATIC_CONTEXT_ID = 1;
export const STATIC_CONTEXT: ContextId = Object.freeze({
  id: STATIC_CONTEXT_ID,
});

export const PROVIDER_ID_KEY = Symbol.for("PROVIDER_KEY");
