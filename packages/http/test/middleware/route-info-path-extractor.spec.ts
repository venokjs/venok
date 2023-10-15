import { expect } from "chai";
import { RouteInfoPathExtractor } from "../../middleware/extractor";
import { RequestMethod, VersioningType } from "../../enums";
import { mapToExcludeRoute } from "../../middleware/utils";
import { HttpConfig } from "../../application/config";

describe("RouteInfoPathExtractor", () => {
  describe("extractPathsFrom", () => {
    let httpConfig: HttpConfig;
    let routeInfoPathExtractor: RouteInfoPathExtractor;

    beforeEach(() => {
      httpConfig = new HttpConfig();
      httpConfig.enableVersioning({
        type: VersioningType.URI,
      });
      routeInfoPathExtractor = new RouteInfoPathExtractor(httpConfig);
    });

    it(`should return correct paths`, () => {
      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "*",
          method: RequestMethod.ALL,
        }),
      ).to.eql(["/*"]);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "*",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql(["/v1/*"]);
    });

    it(`should return correct paths when set global prefix`, () => {
      Reflect.set(routeInfoPathExtractor, "prefixPath", "/api");

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "*",
          method: RequestMethod.ALL,
        }),
      ).to.eql(["/api/*"]);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "*",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql(["/api/v1/*"]);
    });

    it(`should return correct paths when set global prefix and global prefix options`, () => {
      Reflect.set(routeInfoPathExtractor, "prefixPath", "/api");
      Reflect.set(routeInfoPathExtractor, "excludedGlobalPrefixRoutes", mapToExcludeRoute(["foo"]));

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "*",
          method: RequestMethod.ALL,
        }),
      ).to.eql(["/api/*", "/foo"]);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "*",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql(["/api/v1/*", "/v1/foo"]);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "foo",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql(["/v1/foo"]);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: "bar",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql(["/api/v1/bar"]);
    });
  });

  describe("extractPathFrom", () => {
    let httpConfig: HttpConfig;
    let routeInfoPathExtractor: RouteInfoPathExtractor;

    beforeEach(() => {
      httpConfig = new HttpConfig();
      httpConfig.enableVersioning({
        type: VersioningType.URI,
      });
      routeInfoPathExtractor = new RouteInfoPathExtractor(httpConfig);
    });

    it(`should return correct path`, () => {
      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "*",
          method: RequestMethod.ALL,
        }),
      ).to.eql("/*");

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "*",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql("/v1/*");
    });

    it(`should return correct path when set global prefix`, () => {
      Reflect.set(routeInfoPathExtractor, "prefixPath", "/api");

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "*",
          method: RequestMethod.ALL,
        }),
      ).to.eql("/*");

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "*",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql("/api/v1/*");
    });

    it(`should return correct path when set global prefix and global prefix options`, () => {
      Reflect.set(routeInfoPathExtractor, "prefixPath", "/api");
      Reflect.set(routeInfoPathExtractor, "excludedGlobalPrefixRoutes", mapToExcludeRoute(["foo"]));

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "*",
          method: RequestMethod.ALL,
        }),
      ).to.eql("/*");

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "*",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql("/api/v1/*");

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "foo",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql("/v1/foo");

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: "bar",
          method: RequestMethod.ALL,
          version: "1",
        }),
      ).to.eql("/api/v1/bar");
    });
  });
});
