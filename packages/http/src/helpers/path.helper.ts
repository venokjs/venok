export const addLeadingSlash = (path?: string): string => {
  return path && typeof path === "string" ? (path.charAt(0) !== "/" ? "/" + path : path) : "";
};

export const normalizePath = (path?: string): string => {
  return path
    ? path.startsWith("/")
      ? ("/" + path.replace(/\/+$/, "")).replace(/\/+/g, "/")
      : "/" + path.replace(/\/+$/, "")
    : "/";
};

export const stripEndSlash = (path: string) => {
  return path[path.length - 1] === "/" ? path.slice(0, path.length - 1) : path;
}; 

export const isWildcard = (path: string): boolean => {
  return path.includes("*") || path.includes("(.*)");
};

export const isParam = (path: string): boolean => {
  return /:[^/()]+/.test(path);
};

export const isOptionalParam = (path: string): boolean => {
  return /:[^/()]+\?/.test(path);
};

type PathType = "static" | "param" | "optional-param" | "wildcard";

export const getPathType = (path: string): PathType => {
  if (isWildcard(path)) return "wildcard";
  if (isOptionalParam(path)) return "optional-param";
  if (isParam(path)) return "param";
  return "static";
};
