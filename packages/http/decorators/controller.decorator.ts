import { ScopeOptions } from "@venok/core";
import { SCOPE_OPTIONS_METADATA } from "@venok/core/constants";
import { isString, isUndefined } from "@venok/core/helpers/shared.helper";
import { VersionOptions } from "@venok/http/interfaces/version-options.interface";
import { CONTROLLER_WATERMARK, HOST_METADATA, PATH_METADATA, VERSION_METADATA } from "@venok/http/constants";

/**
 * Interface defining options that can be passed to `@Controller()` decorator
 *
 * @publicApi
 */
export interface ControllerOptions extends ScopeOptions, VersionOptions {
  /**
   * Specifies an optional `route path prefix`.  The prefix is pre-pended to the
   * path specified in any request decorator in the class.
   *
   * Supported only by HTTP-based applications (does not apply to non-HTTP microservices).
   */
  path?: string | string[];

  /**
   * Specifies an optional HTTP Request host filter.  When configured, methods
   * within the controller will only be routed if the request host matches the
   * specified value.
   */
  host?: string | RegExp | Array<string | RegExp>;
}

/**
 * Decorator that marks a class as a Venok controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`.
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports. It defines a class that provides a context for
 * one or more message or event handlers.
 *
 * @publicApi
 */
export function Controller(): ClassDecorator;

/**
 * Decorator that marks a class as a Venok controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`.
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports. It defines a class that provides a context for
 * one or more message or event handlers.
 *
 * @param {string|Array} prefix string that defines a `route path prefix`.  The prefix
 * is pre-pended to the path specified in any request decorator in the class.
 *
 * @publicApi
 */
export function Controller(prefix: string | string[]): ClassDecorator;

/**
 * Decorator that marks a class as a Venok controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`.
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports. It defines a class that provides a context for
 * one or more message or event handlers.
 *
 * @param {object} options configuration object specifying:
 *
 * - `scope` - symbol that determines the lifetime of a Controller instance.
 * See Scope for more details.
 * - `prefix` - string that defines a `route path prefix`.  The prefix
 * is pre-pended to the path specified in any request decorator in the class.
 * - `version` - string, array of strings, or Symbol that defines the version
 * of all routes in the class. See Versioning for more details.
 *
 * @publicApi
 */
export function Controller(options: ControllerOptions): ClassDecorator;

/**
 * Decorator that marks a class as a Venok controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports. It defines a class that provides a context for
 * one or more message or event handlers.
 *
 * @param prefixOrOptions a `route path prefix` or a `ControllerOptions` object.
 * A `route path prefix` is pre-pended to the path specified in any request decorator
 * in the class. `ControllerOptions` is an options configuration object specifying:
 * - `scope` - symbol that determines the lifetime of a Controller instance.
 * See Scope for more details.
 * - `prefix` - string that defines a `route path prefix`.  The prefix
 * is pre-pended to the path specified in any request decorator in the class.
 * - `version` - string, array of strings, or Symbol that defines the version
 * of all routes in the class. See Versioning
 * for more details.
 *
 * @publicApi
 */
export function Controller(prefixOrOptions?: string | string[] | ControllerOptions): ClassDecorator {
  const defaultPath = "/";

  const [path, host, scopeOptions, versionOptions] = isUndefined(prefixOrOptions)
    ? [defaultPath, undefined, undefined, undefined]
    : isString(prefixOrOptions) || Array.isArray(prefixOrOptions)
    ? [prefixOrOptions, undefined, undefined, undefined]
    : [
        prefixOrOptions!.path || defaultPath,
        prefixOrOptions!.host,
        { scope: prefixOrOptions!.scope, durable: prefixOrOptions!.durable },
        Array.isArray(prefixOrOptions.version) ? Array.from(new Set(prefixOrOptions.version)) : prefixOrOptions.version,
      ];

  return (target: object) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
    Reflect.defineMetadata(PATH_METADATA, path, target);
    Reflect.defineMetadata(HOST_METADATA, host, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, scopeOptions, target);
    Reflect.defineMetadata(VERSION_METADATA, versionOptions, target);
  };
}
