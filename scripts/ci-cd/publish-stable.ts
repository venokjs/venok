import { getWorkspaceInfo } from "../helpers/get-workspace-info.js";
import { publishPkgToNpm } from "../helpers/publish-pkg-to-npm.js";

/** File name that contains the latest stable version */
const LATEST_FILE = "LATEST";
/** Regex pattern for clean semver versions without pre-release identifiers */
const CLEAN_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

async function main() {
  const latestStableRaw = await Bun.file(LATEST_FILE).text();
  const lastestVersion = latestStableRaw.trim();

  if (!CLEAN_VERSION_REGEX.test(lastestVersion)) throw new Error(`Invalid latest version: ${lastestVersion}`);

  console.log(`New version → ${lastestVersion}`);
  // Get all packages in the workspace
  const workspace = await getWorkspaceInfo();

  // Publishing
  if (!process.env.NPM_TOKEN) throw new Error("NPM_TOKEN not set");

  await Bun.write(".npmrc", `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`);

  for (const pkg of workspace) await publishPkgToNpm(pkg, lastestVersion, "latest");

  console.log("All stable versions published!");
}


main().catch(err => {
  console.error("Publish failed:");
  console.error(err);
  process.exit(1);
});