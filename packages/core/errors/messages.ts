import { InjectorDependency, InjectorDependencyContext } from "@venok/core/injector/injector";
import { DynamicModule, ForwardReference } from "@venok/core/interfaces/modules";
import { isNull, isSymbol } from "@venok/core/helpers/shared.helper";
import { Module } from "@venok/core/injector/module/module";
import { Type } from "@venok/core/interfaces";

/**
 * Returns the name of an instance or `undefined`
 * @param instance The instance which should get the name from
 */
const getInstanceName = (instance: unknown): string => {
  if ((instance as ForwardReference)?.forwardRef) return (instance as ForwardReference).forwardRef()?.name;

  if ((instance as DynamicModule)?.module) return (instance as DynamicModule).module?.name;

  return (instance as Type)?.name;
};

/**
 * Returns the name of the dependency
 * Tries to get the class name, otherwise the string value
 * (= injection token). As fallback, it returns '+'
 * @param dependency The name of the dependency to be displayed
 */
const getDependencyName = (dependency: InjectorDependency): string =>
  // use class name
  getInstanceName(dependency) ||
  // use injection token (symbol)
  (isSymbol(dependency) && dependency.toString()) ||
  // use string directly
  (dependency as string) ||
  // otherwise
  "+";

/**
 * Returns the name of the module
 * Tries to get the class name. As fallback, it returns 'current'.
 * @param module The module which should get displayed
 */
const getModuleName = (module: Module) => (module && getInstanceName(module.metatype)) || "current";

const stringifyScope = (scope: any[]): string => (scope || []).map(getInstanceName).join(" -> ");

export const UNKNOWN_DEPENDENCIES_MESSAGE = (
  type: string | symbol,
  unknownDependencyContext: InjectorDependencyContext,
  module: Module,
) => {
  const { index, name = "dependency", dependencies, key } = unknownDependencyContext;
  const moduleName = getModuleName(module);
  const dependencyName = getDependencyName(name);

  const potentialSolutions =
    // If module's name is well-defined
    moduleName !== "current"
      ? `\n
Potential solutions:
- Is ${moduleName} a valid Venok module?
- If ${dependencyName} is a provider, is it part of the current ${moduleName}?
- If ${dependencyName} is exported from a separate @Module, is that module imported within ${moduleName}?
  @Module({
    imports: [ /* the Module containing ${dependencyName} */ ]
  })
`
      : `\n
Potential solutions:
- If ${dependencyName} is a provider, is it part of the current Module?
- If ${dependencyName} is exported from a separate @Module, is that module imported within Module?
  @Module({
    imports: [ /* the Module containing ${dependencyName} */ ]
  })
`;

  let message = `Venok can't resolve dependencies of the ${type.toString()}`;

  if (isNull(index) && key) {
    message += `. Please make sure that the "${key.toString()}" property is available in the current context.${potentialSolutions}`;
    return message;
  }
  const dependenciesName = (dependencies || []).map(getDependencyName);
  // @ts-ignore
  dependenciesName[index] = "?";

  message += ` (`;
  message += dependenciesName.join(", ");
  message += `). Please make sure that the argument ${dependencyName} at index [${index}] is available in the ${moduleName} context.`;
  message += potentialSolutions;

  return message;
};

export const UNDEFINED_FORWARDREF_MESSAGE = (
  scope: Type[],
) => `Venok cannot create the module instance. Often, this is because of a circular dependency between modules. Use forwardRef() to avoid it.

Scope [${stringifyScope(scope)}]
`;

export const INVALID_MODULE_MESSAGE = (parentModule: any, index: number, scope: any[]) => {
  const parentModuleName = parentModule?.name || "module";

  return `Venok cannot create the ${parentModuleName} instance.
Received an unexpected value at index [${index}] of the ${parentModuleName} "imports" array.

Scope [${stringifyScope(scope)}]`;
};

export const USING_INVALID_CLASS_AS_A_MODULE_MESSAGE = (
  metatypeUsedAsAModule: Type | ForwardReference,
  scope: any[],
) => {
  const metatypeNameQuote = `"${getInstanceName(metatypeUsedAsAModule)}"` || "that class";

  return `Classes annotated with @Injectable(), @Catch(), and @Controller() decorators must not appear in the "imports" array of a module.
Please remove ${metatypeNameQuote} (including forwarded occurrences, if any) from all of the "imports" arrays.

Scope [${stringifyScope(scope)}]
`;
};

export const UNDEFINED_MODULE_MESSAGE = (parentModule: any, index: number, scope: any[]) => {
  const parentModuleName = parentModule?.name || "module";

  return `Venok cannot create the ${parentModuleName} instance.
The module at index [${index}] of the ${parentModuleName} "imports" array is undefined.

Potential causes:
- A circular dependency between modules. Use forwardRef() to avoid it.
- The module at index [${index}] is of type "undefined". Check your import statements and the type of the module.

Scope [${stringifyScope(scope)}]`;
};

export const UNKNOWN_EXPORT_MESSAGE = (token: string | symbol = "item", module: string) => {
  token = isSymbol(token) ? token.toString() : token;

  return `Venok cannot export a provider/module that is not a part of the currently processed module (${module}). Please verify whether the exported ${token} is available in this particular context.

Possible Solutions:
- Is ${token} part of the relevant providers/imports within ${module}?
`;
};

export const INVALID_CLASS_MESSAGE = (text: TemplateStringsArray, value: any) =>
  `ModuleRef cannot instantiate class (${value} is not constructable).`;

export const INVALID_CLASS_SCOPE_MESSAGE = (text: TemplateStringsArray, name: string | undefined) =>
  `${
    name || "This class"
  } is marked as a scoped provider. Request and transient-scoped providers can't be used in combination with "get()" method. Please, use "resolve()" instead.`;

export const UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Runtime Exception.`;
export const INVALID_EXCEPTION_FILTER = `Invalid exception filters (@UseFilters()).`;
export const MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION = `Unable to load @Venok/microservices package. (Please make sure that it's already installed.)`;
