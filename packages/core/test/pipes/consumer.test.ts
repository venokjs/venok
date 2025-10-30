import type { PipeTransform } from "~/interfaces/index.js";

import { beforeEach, describe, expect, it, mock } from "bun:test";

import { PipesConsumer } from "~/pipes/consumer.js";

const createPipe = (transform: Function) => ({ transform });

describe("PipesConsumer", () => {
  let consumer: PipesConsumer;
  beforeEach(() => {
    consumer = new PipesConsumer();
  });
  describe("apply", () => {
    let value: any, metatype: any, type: any, transforms: PipeTransform[], data: any, contextType: any;
    beforeEach(() => {
      value = 0;
      data = null;
      (metatype = {}), (type = "query");
      contextType = "native";
      transforms = [
        createPipe(mock((val) => val + 1)),
        createPipe(mock((val) => Promise.resolve(val + 1))),
        createPipe(mock((val) => val + 1)),
      ] as PipeTransform[];
    });
    it("should call all transform functions", (done) => {
      consumer.apply(value, { metatype, type, data, contextType }, transforms).then(() => {
        transforms.forEach((transform: any) => {
          expect(transform.transform).toHaveBeenCalled();
        });
        done();
      });
    });
    it("should return expected result", (done) => {
      const expectedResult = 3;
      consumer.apply(value, { metatype, type, data, contextType }, transforms).then((result) => {
        expect(result).toEqual(expectedResult);
        done();
      });
    });
  });
});
