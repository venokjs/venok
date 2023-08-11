import {copyFile} from "fs/promises";
import {join} from "path";

const files = ["package.json", "readme.md"];

const move = async () => {
  const pkg = process.argv[2];
  const src = process.cwd();
  const dist = join(src, "../../dist", pkg);

  for (const file of files) {
    try {
      await copyFile(join(src, file), join(dist, file));
    } catch (e) {
      console.log(e);
    }
  }
};

move();
