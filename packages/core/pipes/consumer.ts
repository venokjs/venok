import { ArgumentMetadata, PipeTransform } from "@venok/core";

export class PipesConsumer {
  public async apply<TInput = unknown>(
    value: TInput,
    { metatype, type, data }: ArgumentMetadata,
    pipes: PipeTransform[],
  ) {
    /* TODO Get type */
    return this.applyPipes(value, { metatype, type, data }, pipes);
  }

  public async applyPipes<TInput = unknown>(
    value: TInput,
    { metatype, type, data }: { metatype: any; type?: any; data?: any },
    transforms: PipeTransform[],
  ) {
    return transforms.reduce(async (deferredValue, pipe) => {
      const val = await deferredValue;
      return pipe.transform(val, { metatype, type, data });
    }, Promise.resolve(value));
  }
}
