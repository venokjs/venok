import type { PipeTransform, Type } from "@venok/core";

import { createNativeParamDecorator, createNativeParamDecoratorWithoutPipes } from "@venok/core";

import { RESPONSE_PASSTHROUGH_METADATA } from "~/constants.js";
import { HttpParamtypes } from "~/enums/paramtypes.enum.js";


export interface ResponseDecoratorOptions {
  /**
   * Determines whether the response will be sent manually within the route handler,
   * with the use of native response handling methods exposed by the platform-specific response object,
   * or if it should pass through Venok response processing pipeline.
   *
   * @default false
   */
  passthrough: boolean;
}

/**
 * Route handler parameter decorator. Extracts the `Context`
 * object from the execution context and populates the decorated
 * parameter with the value of `Context`.
 *
 * Example: `logout(@Context() ctx)`
 *
 * @publicApi
 */
export const HttpContext: () => ParameterDecorator = (options?: { response?: ResponseDecoratorOptions }) => {
  return (target, key, index) => {
    if (options?.response && options.response?.passthrough) {
      Reflect.defineMetadata(RESPONSE_PASSTHROUGH_METADATA, options.response.passthrough, target.constructor, key as string);
    }
    return createNativeParamDecoratorWithoutPipes(HttpParamtypes.CONTEXT)()(target, key, index);
  };
};

/**
 * Route handler parameter decorator. Extracts the `Ip` property
 * from the `req` object and populates the decorated
 * parameter with the value of `ip`.
 *
 * @publicApi
 */
export const Ip: () => ParameterDecorator = createNativeParamDecoratorWithoutPipes(HttpParamtypes.IP);

/**
 * Route handler parameter decorator. Extracts the file object from context
 * and populates the decorated parameter with the value of `file`.
 * Used in conjunction with multer middleware
 *
 * For example:
 * ```ts
 * uploadFile(@UploadedFile("image") file) {
 *   console.log(file);
 * }
 * ```
 *
 * @param fileKey {string} File key from request body
 *
 * @publicApi
 */
export function UploadedFile(fileKey: string): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the file object from context
 * and populates the decorated parameter with the value of `file`.
 *
 * For example:
 * ```ts
 * uploadFile(@UploadedFile("image") file) {
 *   console.log(file);
 * }
 * ```
 *
 * @param fileKey {string} File key from request body
 * @param pipes One or more pipes to apply to the file
 *
 * @publicApi
 */
export function UploadedFile(fileKey: string, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator {
  return createNativeParamDecorator(HttpParamtypes.FILE)(fileKey, ...pipes);
}

/**
 * Route handler parameter decorator. Extracts the file objects from context
 * and populates the decorated parameter with the value of `files`.
 *
 * For example:
 * ```ts
 * uploadFile(@UploadedFiles("images") files) {
 *   console.log(files);
 * }
 * ```
 *
 * @param filesKey {string} Files key from request body
 *
 * @publicApi
 */
export function UploadedFiles(filesKey: string): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the file objects from context
 * and populates the decorated parameter with the value of `files`.
 *
 * For example:
 * ```ts
 * uploadFile(@UploadedFiles("images") files) {
 *   console.log(files);
 * }
 * ```
 *
 * @param filesKey {string} Files key from request body
 * @param pipes One or more pipes to apply to the files
 *
 * @publicApi
 */
export function UploadedFiles(filesKey: string, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator {
  return createNativeParamDecorator(HttpParamtypes.FILES)(filesKey, ...pipes);
}

/**
 * Route handler parameter decorator. Extracts the file objects from context
 * and populates the decorated parameter with the value of `files`.
 *
 * If fields not specified all files from context will return
 *
 * For example:
 * ```ts
 * uploadFile(@MultipleUploadedFiles("videos") files) {
 *   console.log(files);
 * }
 * ```
 *
 * @param fields Array of file keys from request body
 *
 * @publicApi
 */
export function MultipleUploadedFiles(fields?: { field: string }[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the file objects from context
 * and populates the decorated parameter with the value of `files`.
 *
 * If fields not specified all files from context will return
 *
 * For example:
 * ```ts
 * uploadFile(@MultipleUploadedFiles() files) {
 *   console.log(files);
 * }
 * ```
 *
 * @param fields Array of file keys from request body
 * @param pipes One or more pipes to apply to the files
 *
 * @publicApi
 */
export function MultipleUploadedFiles(fields?: { field: string }[], ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the file objects from context
 * and populates the decorated parameter with the value of `files`.
 *
 * If fields not specified all files from context will return
 *
 * For example:
 * ```ts
 * uploadFile(@MultipleUploadedFiles("images") files) {
 *   console.log(files);
 * }
 * ```
 *
 * @param fields Array of file keys from request body
 * @param pipes One or more pipes to apply to the files
 *
 * @publicApi
 */
export function MultipleUploadedFiles(
  fields?: { field: string }[] | Type<PipeTransform> | PipeTransform,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createNativeParamDecorator(HttpParamtypes.MULTIPLE_FILES)(fields, ...pipes);
}

/**
 * Route handler parameter decorator. Extracts the `headers`
 * property from the `req` object and populates the decorated
 * parameter with the value of `headers`.
 *
 * For example: `async update(@Headers('Cache-Control') cacheControl: string)`
 *
 * @param property name of single header property to extract.
 *
 * @publicApi
 */
export const Headers: (property?: string) => ParameterDecorator = createNativeParamDecoratorWithoutPipes(HttpParamtypes.HEADERS);

/**
 * Route handler parameter decorator. Extracts the `query`
 * property from the `req` object and populates the decorated
 * parameter with the value of `query`. May also apply pipes to the bound
 * query parameter.
 *
 * For example:
 * ```ts
 * async find(@Query('user') user: string)
 * ```
 *
 * @publicApi
 */
export function Query(): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `query`
 * property from the `req` object and populates the decorated
 * parameter with the value of `query`. May also apply pipes to the bound
 * query parameter.
 *
 * For example:
 * ```ts
 * async find(@Query('user') user: string)
 * ```
 *
 * @param pipes one or more pipes to apply to the bound query parameter
 *
 * @publicApi
 */
export function Query(...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `query`
 * property from the `req` object and populates the decorated
 * parameter with the value of `query`. May also apply pipes to the bound
 * query parameter.
 *
 * For example:
 * ```ts
 * async find(@Query('user') user: string)
 * ```
 *
 * @param property name of single property to extract from the `query` object
 * @param pipes one or more pipes to apply to the bound query parameter
 *
 * @publicApi
 */
export function Query(property: string, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `query`
 * property from the `req` object and populates the decorated
 * parameter with the value of `query`. May also apply pipes to the bound
 * query parameter.
 *
 * For example:
 * ```ts
 * async find(@Query('user') user: string)
 * ```
 *
 * @param property name of single property to extract from the `query` object
 * @param pipes one or more pipes to apply to the bound query parameter
 *
 * @publicApi
 */
export function Query(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createNativeParamDecorator(HttpParamtypes.QUERY)(property, ...pipes);
}

/**
 * Route handler parameter decorator. Extracts the entire `body`
 * object from the `req` object and populates the decorated
 * parameter with the value of `body`.
 *
 * For example:
 * ```ts
 * async create(@Body() createDto: CreateCatDto)
 * ```
 *
 * @publicApi
 */
export function Body(): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the entire `body`
 * object from the `req` object and populates the decorated
 * parameter with the value of `body`. Also applies the specified
 * pipes to that parameter.
 *
 * For example:
 * ```ts
 * async create(@Body(new ValidationPipe()) createDto: CreateCatDto)
 * ```
 *
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound body parameter.
 *
 * @publicApi
 */
export function Body(...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts a single property from
 * the `body` object property of the `req` object and populates the decorated
 * parameter with the value of that property. Also applies pipes to the bound
 * body parameter.
 *
 * For example:
 * ```ts
 * async create(@Body('role', new ValidationPipe()) role: string)
 * ```
 *
 * @param property name of single property to extract from the `body` object
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound body parameter.
 *
 * @publicApi
 */
export function Body(property: string, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the entire `body` object
 * property, or optionally a named property of the `body` object, from
 * the `req` object and populates the decorated parameter with that value.
 * Also applies pipes to the bound body parameter.
 *
 * For example:
 * ```ts
 * async create(@Body('role', new ValidationPipe()) role: string)
 * ```
 *
 * @param property name of single property to extract from the `body` object
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound body parameter.
 *
 * @publicApi
 */
export function Body(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createNativeParamDecorator(HttpParamtypes.BODY)(property, ...pipes);
}

/**
 * Route handler parameter decorator. Extracts the `params`
 * property from the `req` object and populates the decorated
 * parameter with the value of `params`. May also apply pipes to the bound
 * parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findOne(@Param() params: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * findOne(@Param('id') id: string)
 * ```
 *
 * @publicApi
 */
export function Param(): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `params`
 * property from the `req` object and populates the decorated
 * parameter with the value of `params`. May also apply pipes to the bound
 * parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findOne(@Param() params: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * findOne(@Param('id') id: string)
 * ```
 * 
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function Param(...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `params`
 * property from the `req` object and populates the decorated
 * parameter with the value of `params`. May also apply pipes to the bound
 * parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findOne(@Param() params: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * findOne(@Param('id') id: string)
 * ```
 * 
 * @param property name of single property to extract from the `req` object
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function Param(property: string, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `params`
 * property from the `req` object and populates the decorated
 * parameter with the value of `params`. May also apply pipes to the bound
 * parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findOne(@Param() params: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * findOne(@Param('id') id: string)
 * ```
 * 
 * @param property name of single property to extract from the `req` object
 * @param pipes one or more pipes - either instances or classes - to apply to
 * the bound parameter.
 *
 * @publicApi
 */
export function Param(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createNativeParamDecorator(HttpParamtypes.PARAM)(property, ...pipes);
}

/**
 * Route handler parameter decorator. Extracts the `hosts`
 * property from the `req` object and populates the decorated
 * parameter with the value of `hosts`. May also apply pipes to the bound
 * parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findOne(@HostParam() params: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * findOne(@HostParam('id') id: string)
 * ```
 *
 * @publicApi
 */
export function HostParam(): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `hosts`
 * property from the `req` object and populates the decorated
 * parameter with the value of `hosts`. May also apply pipes to the bound
 * parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findOne(@HostParam() params: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * findOne(@HostParam('id') id: string)
 * ```
 * @param property name of single property to extract from the `req` object
 *
 * @publicApi
 */
export function HostParam(property: string): ParameterDecorator;

/**
 * Route handler parameter decorator. Extracts the `hosts`
 * property from the `req` object and populates the decorated
 * parameter with the value of `params`. May also apply pipes to the bound
 * parameter.
 *
 * For example, extracting all params:
 * ```ts
 * findOne(@HostParam() params: string[])
 * ```
 *
 * For example, extracting a single param:
 * ```ts
 * findOne(@HostParam('id') id: string)
 * ```
 * @param property name of single property to extract from the `req` object
 *
 * @publicApi
 */
export function HostParam(property?: string | (Type<PipeTransform> | PipeTransform)): ParameterDecorator {
  return createNativeParamDecoratorWithoutPipes(HttpParamtypes.HOST)(property);
}