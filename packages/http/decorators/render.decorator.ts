import { RENDER_METADATA } from "@venok/http/constants";

/**
 * Route handler method Decorator. Defines a template to be rendered by the controller.
 *
 * For example: `@Render('index')`
 *
 * @param template name of the render engine template file
 *
 * @publicApi
 */
export function Render(template: string): MethodDecorator {
  return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(RENDER_METADATA, template, descriptor.value);
    return descriptor;
  };
}