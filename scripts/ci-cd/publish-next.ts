#!/usr/bin/env bun

import rootPackageJson from "../../package.json" with { type: "json" };
import { getWorkspaceInfo } from "../helpers/get-workspace-info.js";

/** File name that contains the latest stable version */
const LATEST_FILE = "LATEST";
/** Representative package used to check current next tag in registry */
const REPRESENTATIVE_PACKAGE = "@venok/core";
/** Regex pattern for strict validation of next versions (X.Y.Z-next.N format) */
const NEXT_VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)-next\.(\d+)$/;
/** Regex pattern for clean semver versions without pre-release identifiers */
const CLEAN_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Represents NPM distribution tags for a package
 */
type DistTags = {
  /** The latest stable version tag */
  latest?: string;
  /** The next/canary version tag */
  next?: string;
  /** Any other custom tags */
  [tag: string]: string | undefined;
};

/**
 * Retrieves the current next/canary version tag from the NPM registry
 * 
 * @returns The current next version string if it exists and is valid, null otherwise
 * @throws Does not throw - catches all errors and returns null for first-time publishing
 */
async function getCurrentCanaryTag(): Promise<string | null> {
  try {
    const result: DistTags = await Bun.$`bun pm view ${REPRESENTATIVE_PACKAGE} dist-tags --json`.json();
    const tag = result.next?.trim();

    if (!tag) return null;
    if (!NEXT_VERSION_REGEX.test(tag)) {
      console.log(`Warning: Current canary (next) tag "${tag}" doesn't match format X.Y.Z-next.N → ignore`);
      return null;
    }

    return tag;
  } catch {
    console.log("No next tag in registry → first next version");
    return null;
  }
}

/**
 * Compares two semantic version strings to determine if the first is greater than the second
 * 
 * @param a - First version string to compare (must be clean semver format X.Y.Z)
 * @param b - Second version string to compare (must be clean semver format X.Y.Z)
 * @returns True if version A is greater than version B, false otherwise
 */
function isVersionAGreaterThanB(a: string, b: string): boolean {
  if (!CLEAN_VERSION_REGEX.test(a) || !CLEAN_VERSION_REGEX.test(b)) return false;
  const order = Bun.semver.order(a, b);

  return order === 1; // a > b
}

/**
 * Calculates the next version number for a canary/next release
 * 
 * Determines whether to start a new next series (X.Y.Z-next.1) or increment
 * an existing series (X.Y.Z-next.N+1) based on current versions
 * 
 * @param lastestVersion - The latest stable version from LATEST file
 * @param nextVersion - The target version from package.json
 * @param currentCanaryVersion - The current next version from registry (if any)
 * @returns The calculated next version string in format X.Y.Z-next.N
 */
function calculateNextVersion(lastestVersion: string, nextVersion: string, currentCanaryVersion: string | null): string {
  if (
    !currentCanaryVersion ||
    isVersionAGreaterThanB(nextVersion, currentCanaryVersion.split("-")[0]) ||
    isVersionAGreaterThanB(lastestVersion, nextVersion)
  ) {
    // This is the first next release after stable release
    return `${nextVersion}-next.1`;
  }

  // currentCanaryVersion is valid X.Y.Z-next.N format
  const match = currentCanaryVersion.match(NEXT_VERSION_REGEX)!;
  const counter = parseInt(match[4], 10) + 1;
  const base = match.slice(1, 4).join("."); // X.Y.Z
  return `${base}-next.${counter}`;
}

/**
 * Main function that orchestrates the next/canary release process
 * 
 * This function performs the following steps:
 * 1. Reads and validates the latest stable version from LATEST file
 * 2. Reads and validates the target version from root package.json
 * 3. Checks current canary version from NPM registry
 * 4. Calculates the next canary version number
 * 5. Updates all workspace package.json files with the new version
 * 6. Publishes all packages to NPM with the 'next' tag
 * 
 * @throws Error if versions are invalid or equal or if publishing fails
 */
async function main() {
  console.log("Starting next publish...");

  const latestStableRaw = await Bun.file(LATEST_FILE).text();

  const lastestVersion = latestStableRaw.trim();
  const nextVersion = rootPackageJson.version.trim();

  if (!CLEAN_VERSION_REGEX.test(lastestVersion)) throw new Error(`Invalid latest version: ${lastestVersion}`);
  if (!CLEAN_VERSION_REGEX.test(nextVersion)) throw new Error(`Invalid next version: ${nextVersion}`);

  if (lastestVersion === nextVersion) throw new Error("Latest and Next version cannot be equal.");

  const currentCanaryVersion = await getCurrentCanaryTag();

  console.log(`Latest version → ${lastestVersion}`);
  console.log(`Next version → ${nextVersion}`);
  console.log(`Canary version → ${currentCanaryVersion}`);
  const nextCanaryVersion = calculateNextVersion(lastestVersion, nextVersion, currentCanaryVersion);
  console.log(`New version → ${nextCanaryVersion}`);

  // Update all package.json files in the workspace
  const workspace = await getWorkspaceInfo();

  for (const pkg of workspace) {
    const pkgJsonPath = `${pkg.path}/package.json`;
    const pkgJson = structuredClone(pkg.packageJson);
    pkgJson.version = nextCanaryVersion;

    await Bun.write(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
    console.log(`Updated ${pkg.name} → ${nextCanaryVersion}`);
  }

  // // Publishing
  // if (!process.env.NPM_TOKEN) throw new Error("NPM_TOKEN not set");
  //
  // await Bun.write(".npmrc", `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`);

  for (const pkg of workspace) {
    console.log(`Publishing ${pkg.name}@${nextCanaryVersion} --tag next`);
    try {
      // bun publish automatically uses bun.lock and .npmrc
      await Bun.$`cd ${pkg.path} && bun publish --tag next --dry-run`.quiet();
      console.log(`Published ${pkg.name}`);
    } catch (e) {
      console.error(`Failed ${pkg.name}:`, e);
      throw e;
    }
  }

  console.log("All next versions published!");
}

main().catch(err => {
  console.error("Publish failed:");
  console.error(err);
  process.exit(1);
});