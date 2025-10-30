import { build as TsupBuild, type Options as TsupOptions } from "tsup";
import path, { join } from "path";
import type { BunPlugin } from "bun"; // Если нужно, импортируйте типы

import dts from "bun-plugin-dts";

import BunLock from "../../bun.lock";

const banner = `/**
* Thanks for using Venloc SVM <3
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
                `[CRITICAL ERROR]: Don't use imports from index.js. This import type only allowed from interfaces dir. ${match}`,
              );
          }

          // console.log(1, relativePath);

          // Нормализуем к POSIX стилю (с / вместо \)
          relativePath = relativePath.replace(/\\/g, "/") /*.replace("\/index.js", "")*/;
          // Если relativePath не начинается с ./ или ../, добавляем ./
          if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
            relativePath = "./" + relativePath;
          }
          // console.log(prefix, quote, relativePath, quote);
          return `${prefix}${quote}${relativePath}${quote}`;
        });

        // contents = contents.replace("/\/index.js/g", "");

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

function fixCjsImportsPlugin(): BunPlugin {
  return {
    name: "fix-cjs-imports",
    setup(build) {
      build.onLoad({ filter: /\.(js|ts|jsx|tsx)$/ }, async (args) => {
        const contents = await Bun.file(args.path).text();

        // Проверяем, если формат сборки — cjs
        // if (build.config.format === "cjs") {
        // Регулярные выражения для поиска require и import
        const regexCjs = /require\((?<quote>['"])(?<import>\.[^'"]+)\.js['"]\)/g;
        const regexEsm = /from(?<space>[\s]*)(?<quote>['"])(?<import>\.[^'"]+)\.js['"]/g;

        console.log(contents.match(regexCjs), contents);

        // Заменяем .js на .cjs в импортах
        const modifiedContents = contents
          .replace(regexCjs, "require($<quote>$<import>.cjs$<quote>)")
          .replace(regexEsm, "from$<space>$<quote>$<import>.cjs$<quote>");

        return { contents: modifiedContents };
        // }

        // return { contents };
      });
    },
  };
}

export const normalizePath = (str: string) => str.split("\\").join("/");

type ValueTypeFromArray<T> = T extends Array<infer U> ? U : never;
type TsupPlugin = ValueTypeFromArray<Exclude<TsupOptions["plugins"], null | undefined>>;

const fixCJS: TsupPlugin = {
  // https://github.com/egoist/tsup/issues/953#issuecomment-2294998890
  // Maybe use: https://github.com/aymericzip/esbuild-fix-imports-plugin
  // ensuring that all local requires/imports in `.cjs` files import from `.cjs` files.
  // require('./path') → require('./path.cjs') in `.cjs` files
  // require('../path') → require('../path.cjs') in `.cjs` files
  // from './path' → from './path.cjs' in `.cjs` files
  // from '../path' → from '../path.cjs' in `.cjs` files
  name: "fix-cjs-imports",
  renderChunk(code) {
    if (this.format === "cjs") {
      const regexCjs = /require\((?<quote>['"])(?<import>\.[^'"]+)\.js['"]\)/g;
      const regexEsm = /from(?<space>[\s]*)(?<quote>['"])(?<import>\.[^'"]+)\.js['"]/g;
      return {
        code: code
          .replace(regexCjs, "require($<quote>$<import>.cjs$<quote>)")
          .replace(regexEsm, "from$<space>$<quote>$<import>.cjs$<quote>"),
      };
    }
  },
};

const main = async () => {
  // const entries = Object.keys(BunLock.workspaces).slice(1);
  const entries = ["packages/core", "packages/integration", "network/http", "platforms/express"];

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
    } catch {}

    const base: Partial<TsupOptions> = {
      outDir: dist,
      format: ["esm", "cjs"],
      tsconfig: tsconfig,
      external: workspacePackages,
      esbuildOptions: (options) => {
        options.packages = "external";
      },
    };

    // await TsupBuild({
    //   entry: entry,
    //   platform: "node",
    //   ...base,
    //   sourcemap: true,
    //   splitting: false,
    //   bundle: true,
    //   banner: { js: banner },
    //   esbuildOptions(options) {
    //     options.packages = "external";
    //   },
    //   plugins: [fixCJS],
    // });

    // await TsupBuild({
    //   entry: allEntry,
    //   outDir: dist,
    //   format: ["esm"],
    //   target: "ES2021",
    //   minifySyntax: true,
    //   minifyWhitespace: false,
    //   minifyIdentifiers: false,
    //   splitting: false,
    //   sourcemap: false,
    //   cjsInterop: false,
    //   clean: true,
    //   bundle: false,
    //   tsconfig: tsconfig,
    //   external: workspacePackages,
    //   esbuildPlugins: [
    //     /*resolveTsConfigPaths(dir)*/
    //     fixAliasPlugin(),
    //     fixFolderImportsPlugin(),
    //     fixExtensionsPlugin(),
    //   ],
    // });

    // await TsupBuild({
    //   entry: allEntry,
    //   dts: { only: true, banner },
    //   bundle: false,
    //   ...base,
    // });

    await Bun.build({
      entrypoints: allEntries,
      outdir: dist,
      target: "node",
      format: "esm",
      external: ["*"],
      tsconfig: tsconfig,
      plugins: [resolveTsConfigPaths(dir)],
    });

    //
    // await Bun.build({
    //   entrypoints: allEntries,
    //   outdir: dist,
    //   target: "node",
    //   format: "cjs",
    //   external: ["*"],
    //   naming: "[dir]/[name].cjs",
    //   tsconfig: tsconfig,
    //   plugins: [resolveTsConfigPaths(dir)],
    // });

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

    // await Bun.build({
    //   entrypoints: entry,
    //   outdir: "./dist",
    //   tsconfig: tsconfig,
    //   plugins: [dts()],
    // });

    // for (const entryy of allEntries.map(normalizePath)) {
    //   await TsupBuild({
    //     entry: [entryy],
    //     dts: { only: true, banner },
    //     bundle: false,
    //     ...base,
    //     format: ["esm"],
    //   });
    // }

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
