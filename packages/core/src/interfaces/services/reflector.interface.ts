import type { DecoratorsType } from "~/interfaces/index.js";

export interface DecoratorOptions<Options = any, Transformed = Options> {
  /**
   * The key for the metadata.
   * @default uid(21)
   */
  key?: string;

  /**
   * The transform function to apply to the metadata value.
   * @default value => value
   */
  transform?: (value: Options) => Transformed;
}

export interface ClassDecoratorOptions<Options = any, Transformed = Options>
  extends DecoratorOptions<Options, Transformed> {
  type: "class";
}

export interface MethodDecoratorOptions<Options = any, Transformed = Options>
  extends DecoratorOptions<Options, Transformed> {
  type: "method";
}

export interface CreateDecoratorOptions<Options = any, Transformed = Options>
  extends DecoratorOptions<Options, Transformed> {
  /**
   * The decorator type (class or method)
   * @default class & method
   */
  type?: DecoratorsType;
}

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type WithTransform<T extends DecoratorOptions> = WithRequired<T, "transform">;
export type ReflectableDecorator<Options, Transformed = Options> = ((
  opts?: Options,
) => ClassDecorator & MethodDecorator) & {
  KEY: string;
};
export type ReflectableClassDecorator<Options, Transformed = Options> = ((opts?: Options) => ClassDecorator) & {
  KEY: string;
};
export type ReflectableMethodDecorator<Options, Transformed = Options> = ((opts?: Options) => MethodDecorator) & {
  KEY: string;
};
export type ReflectableDecorators<Options, Transformed = any> =
  | ReflectableDecorator<Options, Transformed>
  | ReflectableClassDecorator<Options, Transformed>
  | ReflectableMethodDecorator<Options, Transformed>;
