export const MESSAGES = {
  APPLICATION_START: `Starting Venok application...`,
  APPLICATION_READY: `Venok application successfully started`,
  UNKNOWN_EXCEPTION_MESSAGE: "Internal server error",
  ERROR_DURING_SHUTDOWN: "Error happened during shutdown",
};

export const FORBIDDEN_MESSAGE = "Forbidden resource";

export const MODULE_METADATA = {
  IMPORTS: "imports",
  PROVIDERS: "providers",
  EXPORTS: "exports",
};

export const PIPES_METADATA = "__pipes__";
export const GUARDS_METADATA = "__guards__";
export const INTERCEPTORS_METADATA = "__interceptors__";
export const EXCEPTION_FILTERS_METADATA = "__exceptionFilters__";
export const ENHANCER_KEY_TO_SUBTYPE_MAP = {
  [GUARDS_METADATA]: "guard",
  [INTERCEPTORS_METADATA]: "interceptor",
  [PIPES_METADATA]: "pipe",
  [EXCEPTION_FILTERS_METADATA]: "filter",
} as const;

export type EnhancerSubtype = (typeof ENHANCER_KEY_TO_SUBTYPE_MAP)[keyof typeof ENHANCER_KEY_TO_SUBTYPE_MAP];

export const APP_INTERCEPTOR = "APP_INTERCEPTOR";
export const APP_PIPE = "APP_PIPE";
export const APP_GUARD = "APP_GUARD";
export const APP_FILTER = "APP_FILTER";
export const ENHANCER_TOKEN_TO_SUBTYPE_MAP: Record<
  typeof APP_GUARD | typeof APP_PIPE | typeof APP_FILTER | typeof APP_INTERCEPTOR,
  EnhancerSubtype
> = {
  [APP_GUARD]: "guard",
  [APP_INTERCEPTOR]: "interceptor",
  [APP_PIPE]: "pipe",
  [APP_FILTER]: "filter",
} as const;

export const REQUEST = "REQUEST";
export const GLOBAL_MODULE_METADATA = "__module:global__";
export const PARAMTYPES_METADATA = "design:paramtypes";
export const SELF_DECLARED_DEPS_METADATA = "self:paramtypes";
export const OPTIONAL_DEPS_METADATA = "optional:paramtypes";
export const PROPERTY_DEPS_METADATA = "self:properties_metadata";
export const OPTIONAL_PROPERTY_DEPS_METADATA = "optional:properties_metadata";
export const SCOPE_OPTIONS_METADATA = "scope:options";
export const MODULE_PATH = "__module_path__";
export const ROUTE_ARGS_METADATA = "__routeArguments__";
export const CUSTOM_ROUTE_ARGS_METADATA = "__customRouteArgs__";
export const FILTER_CATCH_EXCEPTIONS = "__filterCatchExceptions__";
export const INJECTABLE_WATERMARK = "__injectable__";
export const CATCH_WATERMARK = "__catch__";
export const ENTRY_PROVIDER_WATERMARK = "__entryProvider__";
export const INQUIRER = "INQUIRER";
