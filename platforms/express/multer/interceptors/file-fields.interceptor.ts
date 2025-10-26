import multer from "multer";
import { Observable } from "rxjs";
import type { MulterField, MulterOptions } from "../interfaces/multer-options.interface.js";
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  mixin,
  Optional,
  type Type,
  type VenokInterceptor,
} from "@venok/core";
import { MULTER_MODULE_OPTIONS } from "../files.constants.js";
import type { MulterModuleOptions } from "../interfaces/index.js";
import { transformException } from "../multer/multer.utils.js";

type MulterInstance = any;

/**
 * @param uploadFields
 * @param localOptions
 * @publicApi
 */
export function FileFieldsInterceptor(
  uploadFields: MulterField[],
  localOptions?: MulterOptions,
): Type<VenokInterceptor> {
  class MixinInterceptor implements VenokInterceptor {
    protected multer: MulterInstance;

    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      options: MulterModuleOptions = {},
    ) {
      this.multer = (multer as any)({
        ...options,
        ...localOptions,
      });
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const [req, res] = context.getArgs();

      await new Promise<void>((resolve, reject) =>
        this.multer.fields(uploadFields)(req, res, (err: any) => {
          if (err) {
            const error = transformException(err);
            return reject(error);
          }
          resolve();
        }),
      );
      return next.handle();
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
