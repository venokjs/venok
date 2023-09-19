export const MODULE_INIT_MESSAGE = (text: TemplateStringsArray, module: string) => `${module} dependencies initialized`;

export const INVALID_EXECUTION_CONTEXT = (methodName: string, currentContext: string) =>
  `Calling ${methodName} is not allowed in this context. Your current execution context is "${currentContext}".`;
