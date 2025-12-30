import { createNativeParamDecoratorWithoutPipes } from "@venok/core";

import { WsParamtype } from "~/enums/ws-paramtype.js";

/**
 * @publicApi
 */
export const Socket: () => ParameterDecorator = createNativeParamDecoratorWithoutPipes(WsParamtype.SOCKET);