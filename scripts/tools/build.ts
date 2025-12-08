import type { Options as TsupOptions } from "tsup";
import type { BunPlugin } from "bun";

import { build as TsupBuild } from "tsup";
import path, { join } from "path";

import BunLock from "../../bun.lock";

const banner = `/**
* Thanks for using Venloc Venok <3
* https://github.com/venloc-tech/svm
*/`;

function resolveTsConfigPaths(dir: string): BunPlugin {
  const absoluteDir = path.resolve(dir);

  return {
    name: "replace-tilde",
    setup(build) {
      build.onLoad({ filter: /\.(js|ts|jsx|tsx)$/ }, async (args) => {
        let contents = await Bun.file(args.path).text();
        const fileDir = path.dirname(args.path);

        // Regex для поиска import/require с путями вида "~/something"
        contents = contents.replace(/(from\s+|require\()(['"])~\/([^'"]+)\2/g, (match, prefix, quote, innerPath) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const targetPath = path.join(absoluteDir, innerPath);
          let relativePath = path.relative(fileDir, targetPath);

          // Удаляем лишние ../, если они есть
          const fileDirParts = fileDir.split(path.sep);
          const targetPathParts = targetPath.split(path.sep);
          const commonPrefixLength = fileDirParts.findIndex((part, i) => part !== targetPathParts[i]);

          if (commonPrefixLength > 0) {
            const necessaryDepth = fileDirParts.length - commonPrefixLength;
            const targetSuffix = targetPathParts.slice(commonPrefixLength).join("/");
            relativePath = Array(Math.max(0, necessaryDepth - 1))
              .fill("..")
              .concat(targetSuffix)
              .join("/");
          }

          if (relativePath.endsWith("index.js")) {
            if (!relativePath.includes("interfaces"))
              throw new Error(
                `[CRITICAL ERROR]: Don't use imports from index.js. This import type only allowed from interfaces dir. ${match}`
              );
          }

          // Нормализуем к POSIX стилю (с / вместо \)
          relativePath = relativePath.replace(/\\/g, "/");
          // Если relativePath не начинается с ./ или ../, добавляем ./
          if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
            relativePath = "./" + relativePath;
          }
          return `${prefix}${quote}${relativePath}${quote}`;
        });

        // if (build.config.format === "cjs") {
        //   const regexCjs = /require\((?<quote>['"])(?<import>\.[^'"]+)\.js['"]\)/g;
        //   const regexEsm = /from(?<space>[\s]*)(?<quote>['"])(?<import>\.[^'"]+)\.js['"]/g;
        //
        //   // Заменяем .js на .cjs в импортах
        //   contents = contents
        //     .replace(regexCjs, "require($<quote>$<import>.cjs$<quote>)")
        //     .replace(regexEsm, "from$<space>$<quote>$<import>.cjs$<quote>");
        //   // .replace("/\/index.js/g", "");
        // }

        return { contents };
      });
    },
  };
}


export const normalizePath = (str: string) => str.split("\\").join("/");

const main = async () => {
  // const entries = Object.keys(BunLock.workspaces).slice(1);
  const entries = ["packages/core", "packages/integration", "packages/http"];

  if (entries.length === 0) throw new Error(`Workspaces not found.`);

  /* If we don't collect all workspace packages (i.e., their names)
   * across the monorepository, TypeScript will include them
   * in the bundle instead of treating them as separate packages.
   */
  const workspacePackages = Object.values(BunLock.workspaces)
    .slice(1)
    .map((workspace) => workspace.name)
    .filter(Boolean) as string[];

  for (const dir of entries) {
    const entry = [normalizePath(join(dir, "src", "index.ts"))];
    const allEntry = entry.concat(normalizePath(join(dir, "src", "**/*.ts")));
    const allEntries = [...new Bun.Glob(allEntry[1]).scanSync()];
    const tsconfig = normalizePath(join(dir, "tsconfig.json"));
    const dist = normalizePath(join(dir, "dist"));
    const nestedDist = normalizePath(join(dir, "dist", dir, "src"));

    try {
      await Bun.$`rm -rf ${dist}`;
    } catch { /* empty */ }

    const base: Partial<TsupOptions> = {
      outDir: dist,
      format: ["esm", "cjs"],
      tsconfig: tsconfig,
      external: workspacePackages,
      esbuildOptions: (options) => {
        options.packages = "external";
      },
    };

    await Bun.build({
      entrypoints: allEntries,
      outdir: dist,
      target: "node",
      format: "esm",
      external: ["*"],
      tsconfig: tsconfig,
      plugins: [resolveTsConfigPaths(dir)],
    });

    // Post-build step: Move files from nestedDist to dist and delete nestedDist
    try {
      // Move all files from nestedDist to dist, flattening the structure
      console.log(`mv -v ./${nestedDist}/* ./${dist}`);

      await Bun.$`mv -v ./${nestedDist}/* ./${dist}`;

      // Delete the nested directory (packages/core/src and its parent if empty)
      await Bun.$`rm -rf ${path.dirname(nestedDist)}`;
      console.log(`Moved files to ${dist} and removed ${nestedDist}`);
    } catch (error) {
      console.error(`Error during post-build file move: ${error}`);
      process.exit(1);
    }

    await TsupBuild({
      entry: entry,
      dts: { only: true, banner },
      bundle: false,
      ...base,
      format: ["esm"],
    });
  }
};

await main();
