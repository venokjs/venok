import { Type } from "@venok/core";

export const UNKNOWN_REQUEST_MAPPING = (metatype: Type) => {
  const className = metatype.name;
  return className
    ? `An invalid controller has been detected. "${className}" does not have the @Controller() decorator but it is being listed in the "controllers" array of some module.`
    : `An invalid controller has been detected. Perhaps, one of your controllers is missing the @Controller() decorator.`;
};

export const INVALID_MIDDLEWARE_CONFIGURATION = `An invalid middleware configuration has been passed inside the module 'configure()' method.`;

export const INVALID_MIDDLEWARE_MESSAGE = (text: TemplateStringsArray, name: string) =>
  `The middleware doesn't provide the 'use' method (${name})`;
