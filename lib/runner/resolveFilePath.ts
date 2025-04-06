import { normalizeFilePath } from "./normalizeFsMap";
import { dirname } from "lib/utils/dirname";

function resolveRelativePath(importPath: string, cwd: string): string {
  // Handle parent directory navigation
  if (importPath.startsWith("../")) {
    const parentDir = dirname(cwd);
    return resolveRelativePath(importPath.slice(3), parentDir);
  }
  // Handle current directory
  if (importPath.startsWith("./")) {
    return resolveRelativePath(importPath.slice(2), cwd);
  }
  // Handle absolute path
  if (importPath.startsWith("/")) {
    return importPath.slice(1);
  }
  // Handle relative path
  return `${cwd}/${importPath}`;
}

function resolveNodeModule(
  modulePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[],
  cwd: string = ""
): string | null {
  const filePaths = new Set(
    Array.isArray(fsMapOrAllFilePaths)
      ? fsMapOrAllFilePaths
      : Object.keys(fsMapOrAllFilePaths)
  );

  const normalizedFilePathMap = new Map<string, string>();
  for (const filePath of filePaths) {
    normalizedFilePathMap.set(normalizeFilePath(filePath), filePath);
  }

  const extensions = ["", ".js", ".jsx", ".ts", ".tsx", ".json"];

  const tryResolveInNodeModules = (basePath: string): string | null => {
    const modulePath1 = normalizeFilePath(
      `${basePath}/node_modules/${modulePath}`
    );
    if (normalizedFilePathMap.has(modulePath1)) {
      return normalizedFilePathMap.get(modulePath1)!;
    }

    const packageJsonPath = normalizeFilePath(
      `${basePath}/node_modules/${modulePath}/package.json`
    );
    if (normalizedFilePathMap.has(packageJsonPath)) {
      const packageJsonFile = normalizedFilePathMap.get(packageJsonPath)!;
      try {
        const packageJson = JSON.parse(
          Array.isArray(fsMapOrAllFilePaths)
            ? ""
            : fsMapOrAllFilePaths[packageJsonFile]
        );

        if (packageJson.main) {
          const mainPath = normalizeFilePath(
            `${basePath}/node_modules/${modulePath}/${packageJson.main}`
          );
          if (normalizedFilePathMap.has(mainPath)) {
            return normalizedFilePathMap.get(mainPath)!;
          }

          for (const ext of extensions) {
            if (ext === "") continue;
            const mainPathWithExt = `${mainPath}${ext}`;
            if (normalizedFilePathMap.has(mainPathWithExt)) {
              return normalizedFilePathMap.get(mainPathWithExt)!;
            }
          }
        }
      } catch (e) {}
    }

    for (const ext of extensions) {
      const indexPath = normalizeFilePath(
        `${basePath}/node_modules/${modulePath}/index${ext}`
      );
      if (normalizedFilePathMap.has(indexPath)) {
        return normalizedFilePathMap.get(indexPath)!;
      }
    }

    return null;
  };

  let result = tryResolveInNodeModules(cwd);
  if (result) return result;

  let currentDir = cwd;
  while (currentDir !== "") {
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;

    currentDir = parentDir;
    result = tryResolveInNodeModules(currentDir);
    if (result) return result;
  }

  result = tryResolveInNodeModules("");
  if (result) return result;

  return null;
}

export const resolveFilePath = (
  unknownFilePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[],
  cwd?: string
) => {
  // Handle parent directory navigation properly
  const resolvedPath = cwd
    ? resolveRelativePath(unknownFilePath, cwd)
    : unknownFilePath;

  const filePaths = new Set(
    Array.isArray(fsMapOrAllFilePaths)
      ? fsMapOrAllFilePaths
      : Object.keys(fsMapOrAllFilePaths)
  );

  if (filePaths.has(resolvedPath)) {
    return resolvedPath;
  }

  const normalizedFilePathMap = new Map<string, string>();
  for (const filePath of filePaths) {
    normalizedFilePathMap.set(normalizeFilePath(filePath), filePath);
  }

  const normalizedResolvedPath = normalizeFilePath(resolvedPath);

  if (normalizedFilePathMap.has(normalizedResolvedPath)) {
    return normalizedFilePathMap.get(normalizedResolvedPath)!;
  }

  // Search for file with a set of different extensions
  const extension = ["tsx", "ts", "json", "js", "jsx"];
  for (const ext of extension) {
    const possibleFilePath = `${normalizedResolvedPath}.${ext}`;
    if (normalizedFilePathMap.has(possibleFilePath)) {
      return normalizedFilePathMap.get(possibleFilePath)!;
    }
  }

  // Check if it's an absolute import
  if (!unknownFilePath.startsWith("./") && !unknownFilePath.startsWith("../")) {
    const normalizedUnknownFilePath = normalizeFilePath(unknownFilePath);
    if (normalizedFilePathMap.has(normalizedUnknownFilePath)) {
      return normalizedFilePathMap.get(normalizedUnknownFilePath)!;
    }
    for (const ext of extension) {
      const possibleFilePath = `${normalizedUnknownFilePath}.${ext}`;
      if (normalizedFilePathMap.has(possibleFilePath)) {
        return normalizedFilePathMap.get(possibleFilePath)!;
      }
    }

    const nodeModuleResult = resolveNodeModule(
      unknownFilePath,
      fsMapOrAllFilePaths,
      cwd
    );
    if (nodeModuleResult) {
      return nodeModuleResult;
    }
  }

  return null;
};

export const resolveFilePathOrThrow = (
  unknownFilePath: string,
  fsMapOrAllFilePaths: Record<string, string> | string[]
) => {
  const resolvedFilePath = resolveFilePath(
    unknownFilePath,
    fsMapOrAllFilePaths
  );
  if (!resolvedFilePath) {
    throw new Error(
      `File not found "${unknownFilePath}", available paths:\n\n${Object.keys(
        fsMapOrAllFilePaths
      ).join(", ")}`
    );
  }
  return resolvedFilePath;
};
