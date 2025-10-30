import { expect } from "chai";
import { createContextId } from "@venok/core/helpers/context-id-factory.helper";

describe("createContextId", () => {
  it('should return an object with random "id" property', () => {
    expect(createContextId()).to.have.property("id");
  });
});
