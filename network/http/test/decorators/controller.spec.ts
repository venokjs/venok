import { expect } from "chai";
import { Controller } from "@venok/http/decorators";
import { VenokBaseDiscovery } from "@venok/http/discovery/base.discovery";
import { Reflector } from "@venok/core";

describe("@Controller", () => {
  const reflectedPath = "test";
  const reflectedHost = "api.example.com";
  const reflectedHostArray = ["api1.example.com", "api2.example.com"];
  const reflectedVersion = "1";
  const reflectedVersionWithDuplicates = ["1", "2", "2", "1", "2", "1"];
  const reflectedVersionWithoutDuplicates = ["1", "2"];

  @Controller()
  class EmptyDecorator {}

  @Controller(reflectedPath)
  class Test {}

  @Controller({ path: reflectedPath, host: reflectedHost })
  class PathAndHostDecorator {}

  @Controller({ path: reflectedPath, host: reflectedHostArray })
  class PathAndHostArrayDecorator {}

  @Controller({ host: reflectedHost })
  class HostOnlyDecorator {}

  @Controller({
    path: reflectedPath,
    host: reflectedHost,
    version: reflectedVersion,
  })
  class PathAndHostAndVersionDecorator {}

  @Controller({ version: reflectedVersion })
  class VersionOnlyDecorator {}

  @Controller({ version: reflectedVersionWithDuplicates })
  class VersionOnlyArrayDecorator {}

  it(`should enhance component with @Controller decorator by Reflector`, () => {
    const controllerDiscovery = Reflector.reflector.get(Controller, EmptyDecorator);

    console.log(controllerDiscovery);

    expect(controllerDiscovery).to.be.instanceof(VenokBaseDiscovery);
  });

  it("should enhance controller with expected path metadata", () => {
    const path1 = Reflector.reflector.get(Controller, Test).getPath();
    expect(path1).to.be.eql(reflectedPath);
    const path2 = Reflector.reflector.get(Controller, PathAndHostDecorator).getPath();
    expect(path2).to.be.eql(reflectedPath);
    const path3 = Reflector.reflector.get(Controller, PathAndHostAndVersionDecorator).getPath();
    expect(path3).to.be.eql(reflectedPath);
  });

  it("should enhance controller with expected host metadata", () => {
    const host1 = Reflector.reflector.get(Controller, PathAndHostDecorator).getHost();
    expect(host1).to.be.eql(reflectedHost);
    const host2 = Reflector.reflector.get(Controller, HostOnlyDecorator).getHost();
    expect(host2).to.be.eql(reflectedHost);
    const host3 = Reflector.reflector.get(Controller, PathAndHostArrayDecorator).getHost();
    expect(host3).to.be.eql(reflectedHostArray);
    const host4 = Reflector.reflector.get(Controller, PathAndHostAndVersionDecorator).getHost();
    expect(host4).to.be.eql(reflectedHost);
  });

  it("should enhance controller with expected version metadata", () => {
    const version = Reflector.reflector.get(Controller, PathAndHostAndVersionDecorator).getVersion();
    expect(version).to.be.eql(reflectedVersion);
    const version2 = Reflector.reflector.get(Controller, VersionOnlyDecorator).getVersion();
    expect(version2).to.be.eql(reflectedVersion);
    const version3 = Reflector.reflector.get(Controller, VersionOnlyArrayDecorator).getVersion();
    expect(version3).to.be.eql(reflectedVersionWithoutDuplicates);
  });

  it("should set default path when no object passed as param", () => {
    const path = Reflector.reflector.get(Controller, EmptyDecorator).getPath();
    expect(path).to.be.eql("/");
    const path2 = Reflector.reflector.get(Controller, HostOnlyDecorator).getPath();
    expect(path2).to.be.eql("/");
    const path3 = Reflector.reflector.get(Controller, VersionOnlyDecorator).getPath();
    expect(path3).to.be.eql("/");
  });

  it("should not set host when no host passed as param", () => {
    const host = Reflector.reflector.get(Controller, Test).getHost();
    expect(host).to.be.undefined;
    const host2 = Reflector.reflector.get(Controller, EmptyDecorator).getHost();
    expect(host2).to.be.undefined;
  });

  it("should not set version when no version passed as param", () => {
    const version = Reflector.reflector.get(Controller, Test).getVersion();
    expect(version).to.be.undefined;
    const version2 = Reflector.reflector.get(Controller, EmptyDecorator).getVersion();
    expect(version2).to.be.undefined;
  });
});
