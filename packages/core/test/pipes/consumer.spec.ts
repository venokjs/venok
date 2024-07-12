import { expect } from "chai";
import sinon from "sinon";
import { PipesConsumer } from "@venok/core/pipes";

const createPipe = (transform: Function) => ({ transform });

describe("PipesConsumer", () => {
  let consumer: PipesConsumer;
  beforeEach(() => {
    consumer = new PipesConsumer();
  });
  describe("apply", () => {
    let value: any, metatype: any, type: any, stringifiedType: any, transforms: any, data: any, contextType: any;
    beforeEach(() => {
      value = 0;
      data = null;
      (metatype = {}), (type = "query");
      stringifiedType = "query";
      contextType = "native";
      transforms = [
        createPipe(sinon.stub().callsFake((val) => val + 1)),
        createPipe(sinon.stub().callsFake((val) => Promise.resolve(val + 1))),
        createPipe(sinon.stub().callsFake((val) => val + 1)),
      ];
    });
    it("should call all transform functions", (done) => {
      consumer.apply(value, { metatype, type, data, contextType }, transforms).then(() => {
        expect(transforms.reduce((prev: any, next: any) => prev && next.transform.called, true)).to.be.true;
        done();
      });
    });
    it("should return expected result", (done) => {
      const expectedResult = 3;
      consumer.apply(value, { metatype, type, data, contextType }, transforms).then((result) => {
        expect(result).to.be.eql(expectedResult);
        done();
      });
    });
  });
});
