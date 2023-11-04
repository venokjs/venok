import { expect } from "chai";
import { Version } from "../../decorators";
import { VERSION_METADATA } from "../../constants";

describe("@Version", () => {
  const version = "1";
  const versions = ["1", "2", "2", "1", "2", "1"];
  const versionsWithoutDuplicates = ["1", "2"];

  class Test {
    @Version(version)
    public static oneVersion() {}

    @Version(versions)
    public static multipleVersions() {}
  }

  it("should enhance method with expected version string", () => {
    const metadata = Reflect.getMetadata(VERSION_METADATA, Test.oneVersion);
    expect(metadata).to.be.eql(version);
  });

  it("should enhance method with expected version array", () => {
    const metadata = Reflect.getMetadata(VERSION_METADATA, Test.multipleVersions);
    expect(metadata).to.be.eql(versionsWithoutDuplicates);
  });
});
