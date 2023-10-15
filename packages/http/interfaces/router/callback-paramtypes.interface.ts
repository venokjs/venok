export type RouterProxyCallback = <TRequest, TResponse>(req?: TRequest, res?: TResponse, next?: () => void) => void;
