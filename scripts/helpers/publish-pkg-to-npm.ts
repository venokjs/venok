import type { WorkspaceInfoItem } from "./get-workspace-info.js";

export const publishPkgToNpm = async (pkg: WorkspaceInfoItem, version: string, tag: "latest" | "next")=> {
  console.log(`Publishing ${pkg.name}@${version} --tag ${tag}`);
  try {
    // bun publish automatically uses bun.lock and .npmrc
    await Bun.write(`${pkg.path}/.npmrc`, `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`);
    await Bun.$`cd ${pkg.path} && bun publish --tag ${tag}`.quiet();
    console.log(`Published ${pkg.name}`);
  } catch (e) {
    console.error(`Failed ${pkg.name}:`, e);
    throw e;
  }
};