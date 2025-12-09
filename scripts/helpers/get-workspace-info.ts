import type { BunLockFileWorkspacePackage } from "bun";

import { join } from "path";

import BunLock from "../../bun.lock";

export type PackageJson = {
  name: string;
  version: string;
  [key: string]: unknown;
};

export type WorkspaceInfoItem = {
  path: string,
  name: string,
  packageJson: PackageJson,
  packageWorkspace: BunLockFileWorkspacePackage,
};

export const getWorkspaceInfo = (): Promise<WorkspaceInfoItem[]> => {
  const paths = Object.entries(BunLock.workspaces).slice(1);

  const info = paths.map(async ([path, workspacePackage]) => {
    const file = Bun.file(join(path, "package.json"));
    if (!await file.exists()) {
      throw new Error(`Cannot find package.json: ${join(path, "package.json")} for package: ${workspacePackage.name}`);
    }

    const pkgJson: PackageJson = await file.json();
    if (!("name" in pkgJson) || !pkgJson.name) {
      throw new Error(`Cannot find name in package.json: ${join(path, "package.json")} for package: ${workspacePackage.name}`);
    }
    if (!("version" in pkgJson) || !pkgJson.version) {
      throw new Error(`Cannot find version in package.json: ${join(path, "package.json")} for package: ${workspacePackage.name}`);
    }

    return {
      path,
      name: workspacePackage.name as string,
      packageJson: pkgJson,
      packageWorkspace: workspacePackage,
    };
  });

  return Promise.all(info);
};

