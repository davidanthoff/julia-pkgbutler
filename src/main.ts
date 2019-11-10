import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function run() {
  try {
    await exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButler.jl", rev="master"))']);

    await exec.exec('git', ['checkout', '-b', 'julia-butler-branch'])

    await exec.exec('julia', ['--color=yes', '-e', 'import PkgButler; PkgButler.update_pkg(pwd())']);
    
    try {
      await exec.exec('git', ['diff-index', '--quiet', 'HEAD', '--']);
    }
    catch (error) {
      
      await exec.exec('git', ['add', '.'])

      await exec.exec('git', ['commit', '-m', '"Julia butler updates"'])

      await exec.exec('git', ['push', 'origin', 'julia-butler-branch'])
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
