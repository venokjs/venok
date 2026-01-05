import { createNativeParamDecoratorWithoutPipes } from "@venok/core";

import { MicroserviceParamtype } from "~/enums/microservice-paramtype.js";

export const Context: () => ParameterDecorator = createNativeParamDecoratorWithoutPipes(MicroserviceParamtype.CONTEXT);