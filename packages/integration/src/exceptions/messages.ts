export const INVALID_MIDDLEWARE_CONFIGURATION = `An invalid middleware configuration has been passed inside the module 'configure()' method.`;

export const INVALID_MIDDLEWARE_MESSAGE = (text: TemplateStringsArray, name: string) =>
  `The middleware doesn't provide the 'use' method (${name})`;
