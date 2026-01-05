import { createNativeParamDecoratorWithoutPipes } from "@venok/core";

import { MicroserviceParamtype } from "~/enums/microservice-paramtype.js";

export const Ctx: () => ParameterDecorator = createNativeParamDecoratorWithoutPipes(MicroserviceParamtype.CONTEXT);