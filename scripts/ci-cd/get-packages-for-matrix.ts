import BunLock from "../../bun.lock";

const paths = Object.keys(BunLock.workspaces).slice(1);

console.log(paths);