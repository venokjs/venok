import type { CallHandler, ExecutionContext, Type, VenokInterceptor } from "@venok/core";

import type { MulterField, MulterModuleOptions, MulterOptions } from "~/interfaces/index.js";

import { Inject, mixin, Optional } from "@venok/core";
import multer from "multer";
import { Observable } from "rxjs";

import { MULTER_MODULE_OPTIONS } from "~/multer/files.constants.js";
import { transformException } from "~/multer/multer/multer.utils.js";

type MulterInstance = any;

/**
 * @param uploadFields
 * @param localOptions
 * @publicApi
 */
export function FileFieldsInterceptor(
  uploadFields: MulterField[],
  localOptions?: MulterOptions
): Type<VenokInterceptor> {
  class MixinInterceptor implements VenokInterceptor {
    protected multer: MulterInstance;

    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      options: MulterModuleOptions = {}
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const error = transformException(err);
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return reject(error);
          }
          resolve();
        })
      );
      return next.handle();
    }
  }
  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
