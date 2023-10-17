import multer from "multer";
import { Observable } from "rxjs";
import { MulterOptions } from "../interfaces/multer-options.interface";
import { CallHandler, ExecutionContext, Inject, mixin, Optional, Type, VenokInterceptor } from "@venok/core";
import { MULTER_MODULE_OPTIONS } from "../files.constants";
import { MulterModuleOptions } from "../interfaces";
import { transformException } from "../multer/multer.utils";

type MulterInstance = any;

/**
 * @param fieldName
 * @param localOptions
 *
 * @publicApi
 */
export function FileInterceptor(fieldName: string, localOptions?: MulterOptions): Type<VenokInterceptor> {
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
        this.multer.single(fieldName)(req, res, (err: any) => {
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
