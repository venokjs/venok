export const addLeadingSlash = (path?: string): string =>
  path && typeof path === "string" ? (path.charAt(0) !== "/" ? "/" + path : path) : "";

export const normalizePath = (path?: string): string =>
  path
    ? path.startsWith("/")
      ? ("/" + path.replace(/\/+$/, "")).replace(/\/+/g, "/")
      : "/" + path.replace(/\/+$/, "")
    : "/";

export const stripEndSlash = (path: string) => (path[path.length - 1] === "/" ? path.slice(0, path.length - 1) : path);
