export type ParamDecoratorEnhancer = ParameterDecorator;
/**
 * @publicApi
 */
export type CustomParamFactory<TData = any, TContext = any, TOutput = any> = (data: TData, context: TContext) => TOutput;
