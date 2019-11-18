import LightningFS from "@isomorphic-git/lightning-fs";
import * as git from "isomorphic-git";
import nodeFS from "fs";

const gitFS: typeof nodeFS = new LightningFS("fs", { wipe: true });
git.plugins.set("fs", gitFS);
const fs = gitFS.promises;

export const readFile = async (
  project: string,
  filepath: string,
  token: string
) => {
  let exists = false;
  try {
    const projectStat = await fs.stat(project);
    exists = projectStat.isDirectory();
  } catch (e) {}

  const remoteDefaultOpts = {
    dir: `/${project}`,
    ref: "master",
    singleBranch: true,
    depth: 1,
    username: "git",
    password: token
  };

  if (!exists) {
    await fs.mkdir(`/${project}`);
    // clone the repo
    await git.clone({
      ...remoteDefaultOpts,
      url: `${window.location.origin}/heroku-git/${project}`
    });
  } else {
    await git.pull({
      ...remoteDefaultOpts
    });
  }

  return fs.readFile(`/${project}/${filepath}`);
};
