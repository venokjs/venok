import { expect } from "chai";

import { Reflector } from "@venok/core";
import { Version, VERSION_METADATA, VersionValue } from "@venok/http";

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
    const metadata = Reflector.reflector.get<VersionValue>(VERSION_METADATA, Test.oneVersion);
    expect(metadata).to.be.eql(version);
  });

  it("should enhance method with expected version array", () => {
    const metadata = Reflector.reflector.get<VersionValue>(VERSION_METADATA, Test.multipleVersions);
    expect(metadata).to.be.eql(versionsWithoutDuplicates);
  });
});
