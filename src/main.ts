import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function run() {
  try {
    await exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButler.jl", rev="master"))'])
    await exec.exec('julia', ['--color=yes', '-e', 'import PkgButler; PkgButler.update_pkg(pwd())'])
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
