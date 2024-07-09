import { Reflector, ScopeOptions } from "@venok/core";
import { SCOPE_OPTIONS_METADATA } from "@venok/core/constants";
import { isString, isUndefined } from "@venok/core/helpers/shared.helper";
import { HOST_METADATA, PATH_METADATA, VERSION_METADATA } from "@venok/http/constants";
import { VersionOptions, VersionValue } from "@venok/http/interfaces";
import { ControllerDiscovery } from "@venok/http/discovery/controller.discovery";

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
   * Supported only by HTTP-based application (does not apply to non-HTTP microservices).
   */
  path?: string | string[];

  /**
   * Specifies an optional HTTP Request host filter. When configured, methods
   * within the controller will only be routed if the request host matches the
   * specified value.
   */
  host?: string | RegExp | Array<string | RegExp>;
}

type Controller2 = {
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
  (): any;

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
  (prefix: string | string[]): any;

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
  (options: ControllerOptions): any;

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
  (prefixOrOptions?: string | string[] | ControllerOptions): any;
};

const defaultPath = "/";

export const Controller = Reflector.createDecorator<string | string[] | ControllerOptions, ControllerDiscovery>({
  type: "class",
  transform: (options) => {
    const [path, host, scopeOptions, versionOptions] = isUndefined(options)
      ? [defaultPath, undefined, undefined, undefined]
      : isString(options) || Array.isArray(options)
      ? [options, undefined, undefined, undefined]
      : [
          options!.path || defaultPath,
          options!.host,
          { scope: options!.scope, durable: options!.durable },
          (Array.isArray(options.version) ? Array.from(new Set(options.version)) : options.version) as VersionValue,
        ];

    return new ControllerDiscovery({
      [PATH_METADATA]: path,
      [HOST_METADATA]: host,
      [SCOPE_OPTIONS_METADATA]: scopeOptions,
      [VERSION_METADATA]: versionOptions,
    });
  },
});
