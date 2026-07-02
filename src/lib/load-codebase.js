import { readFileSync } from "fs";
import { join } from "path";

export function buildTree(files) {
  const root = { name: "", type: "root", children: [] };
  for (const file of files) {
    const parts = file.Path.split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      let found = node.children.find((c) => c.type === "folder" && c.name === dir);
      if (!found) {
        found = { name: dir, type: "folder", children: [] };
        node.children.push(found);
      }
      node = found;
    }
    node.children.push({ name: parts[parts.length - 1], type: "file", path: file.Path });
  }
  return root;
}

/**
 * Load a codebase from public/Codebases/<folderName>.
 * Returns { codebaseName, files, filesCode, fileTree } ready to spread into <GroupRaidArena />.
 */
export function loadCodebase(folderName) {
  const cbRoot   = join(process.cwd(), "public", "Codebases", folderName);
  const master   = JSON.parse(readFileSync(join(cbRoot, "master.json"), "utf-8"));

  const filesCode = {};
  for (const file of master.Files) {
    try {
      filesCode[file.Path] = readFileSync(join(cbRoot, file.Path), "utf-8");
    } catch {
      filesCode[file.Path] = `// Could not load: ${file.Path}\n`;
    }
  }

  return {
    codebaseName: master["Codebase Name"],
    files:        master.Files,
    filesCode,
    fileTree:     buildTree(master.Files),
  };
}
