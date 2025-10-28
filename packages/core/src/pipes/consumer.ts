import type { ArgumentMetadata, PipeTransform } from "~/interfaces/index.js";

export class PipesConsumer {
  public async apply<TInput = unknown>(value: TInput, metadata: ArgumentMetadata, pipes: PipeTransform[]) {
    return this.applyPipes<TInput>(value, metadata, pipes);
  }

  public async applyPipes<TInput = unknown>(value: TInput, metadata: ArgumentMetadata, transforms: PipeTransform[]) {
    return transforms.reduce(async (deferredValue, pipe) => {
      const val = await deferredValue;
      return pipe.transform(val, metadata);
    }, Promise.resolve(value));
  }
}
