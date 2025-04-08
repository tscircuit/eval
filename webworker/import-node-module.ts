import { evalCompiledJs } from "./eval-compiled-js";
import type { ExecutionContext } from "./execution-context";
import * as Babel from "@babel/standalone";
import { resolveNodeModule } from "lib/utils/resolve-node-module";

export const importNodeModule = async (
  importName: string,
  ctx: ExecutionContext,
  depth = 0
) => {
  const { preSuppliedImports } = ctx;

  if (preSuppliedImports[importName]) {
    return;
  }

  const resolvedNodeModulePath = resolveNodeModule(
    importName,
    ctx.fsMap,
    ""
  );

  if (!resolvedNodeModulePath) {
    throw new Error(`Node module "${importName}" not found`);
  }

  const fileContent = ctx.fsMap[resolvedNodeModulePath];

  const result = Babel.transform(fileContent, {
    presets: ["env", "typescript"],
    plugins: ["transform-modules-commonjs"],
    filename: resolvedNodeModulePath,
    // Enable TypeScript parsing
    parserOpts: {
      plugins: ["typescript"]
    }
  });

  if (!result || !result.code) {
    throw new Error("Failed to transform node module code");
  }
  
  // Evaluate the compiled code
  const moduleExports = evalCompiledJs(
    result.code,
    preSuppliedImports,
    ""
  ).exports;
  
  // Check if this is from a package.json resolution and determine if it's from module field
  let isFromModuleField = false;
  let isFromMainField = false;
  
  // Check if this is a package.json resolution by looking for package.json
  if (resolvedNodeModulePath.includes('/node_modules/')) {
    const packagePath = resolvedNodeModulePath.split('/node_modules/')[1].split('/');
    const scope = packagePath[0].startsWith('@') ? packagePath.slice(0, 2).join('/') : packagePath[0];
    const packageJsonPath = `node_modules/${scope}/package.json`;
    
    if (ctx.fsMap[packageJsonPath]) {
      try {
        const packageJson = JSON.parse(ctx.fsMap[packageJsonPath]);
        
        if (packageJson.module && resolvedNodeModulePath.includes(packageJson.module)) {
          isFromModuleField = true;
        } else if (packageJson.main && resolvedNodeModulePath.includes(packageJson.main)) {
          isFromMainField = true;
        }
      } catch (error) {
        // Silently continue if package.json parsing fails
      }
    }
  }
  
  // Always map the original import name to the exports
  preSuppliedImports[importName] = moduleExports;
  
  // If resolved from module field, only add routes for the module field
  if (isFromModuleField) {
    // Only map the module path
    preSuppliedImports[resolvedNodeModulePath.replace(/^node_modules\//, '')] = moduleExports;
  } 
  // If resolved from main field or it's an index file not from package.json resolution
  else if (isFromMainField || ((resolvedNodeModulePath.endsWith('index.js') || resolvedNodeModulePath.endsWith('index.ts')) && !isFromModuleField && !isFromMainField)) {
    // For index files, also map the directory name
    if (resolvedNodeModulePath.endsWith('index.js') || resolvedNodeModulePath.endsWith('index.ts')) {
      const dirName = resolvedNodeModulePath.replace(/\/index\.(js|ts)$/, '');
      preSuppliedImports[dirName.replace(/^node_modules\//, '')] = moduleExports;
      
      // Special handling for scoped packages with index files
      if (dirName.includes('@') && dirName.includes('/')) {
        const scopedPackagePath = dirName.split('/node_modules/')[1];
        if (scopedPackagePath && scopedPackagePath.startsWith('@')) {
          // Extract the scoped package name (e.g., @scope/package)
          const scopeParts = scopedPackagePath.split('/');
          if (scopeParts.length >= 2) {
            const scopedPackageName = `${scopeParts[0]}/${scopeParts[1]}`;
            preSuppliedImports[scopedPackageName] = moduleExports;
          }
        }
      }
    }
    
    // Also map the full resolved path (without node_modules prefix)
    preSuppliedImports[resolvedNodeModulePath.replace(/^node_modules\//, '')] = moduleExports;
  }
  // Default case - not from package.json or couldn't determine
  else {
    // Map the full resolved path (without node_modules prefix)
    preSuppliedImports[resolvedNodeModulePath.replace(/^node_modules\//, '')] = moduleExports;
  }
}
