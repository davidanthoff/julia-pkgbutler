import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function run() {
  try {
    const GITHUB_TOKEN = core.getInput('github-token', { required: true });
    const REMOTE_REPO = `https://${process.env.GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;

    await exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButler.jl", rev="master"))']);

    await exec.exec('git', ['checkout', '-b', 'julia-butler-branch'])

    await exec.exec('julia', ['--color=yes', '-e', 'import PkgButler; PkgButler.update_pkg(pwd())']);
    
    let ret_code = await exec.exec('git', ['diff-index', '--quiet', 'HEAD', '--']);

    if (ret_code!=1) {
      await exec.exec('git', ['config', '--global', 'user.name', '"Julia Package Butler"'])
      await exec.exec('git', ['config', '--global', 'user.email', '"<>"'])

      await exec.exec('git', ['add', '.'])

      await exec.exec('git', ['commit', '-m', '"Julia butler updates"'])

      await exec.exec('git', ['remote', 'add', 'publisher', REMOTE_REPO]);

      await exec.exec('git', ['push', 'publisher', 'julia-butler-branch'])
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
