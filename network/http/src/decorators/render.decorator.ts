import { Reflector } from "@venok/core";

/**
 * Route handler method Decorator. Defines a template to be rendered by the controller.
 *
 * For example: `@Render('index')`
 *
 * @param template name of the render engine template file
 *
 * @publicApi
 */
export const Render = Reflector.createDecorator<string>({ type: "method" });
