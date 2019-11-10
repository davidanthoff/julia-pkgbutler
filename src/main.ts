import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from'@actions/github';

async function run() {
  try {
    const GITHUB_TOKEN = core.getInput('github-token', { required: true });
    const REMOTE_REPO = `https://${process.env.GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;

    const octokit = new github.GitHub(GITHUB_TOKEN);

    await exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButler.jl", rev="master"))']);

    // TODO Handle this in a better way
    try {
      await exec.exec('git', ['branch', '-D', 'julia-pkgbutler-updates'])
    } catch (error) {

    }

    await exec.exec('git', ['checkout', '-b', 'julia-pkgbutler-updates'])

    await exec.exec('julia', ['--color=yes', '-e', 'import PkgButler; PkgButler.update_pkg(pwd())']);
    
    let ret_code = await exec.exec('git', ['diff-index', '--quiet', 'HEAD', '--']);

    if (ret_code!=1) {
      await exec.exec('git', ['config', '--global', 'user.name', '"Julia Package Butler"'])
      await exec.exec('git', ['config', '--global', 'user.email', '"<>"'])

      await exec.exec('git', ['add', '.'])

      await exec.exec('git', ['commit', '-m', '"Julia butler updates"'])

      await exec.exec('git', ['remote', 'add', 'publisher', REMOTE_REPO]);

      await exec.exec('git', ['push', '-f', 'publisher', 'julia-pkgbutler-updates'])

      octokit.pulls.create({
        ...github.context.repo,
        title: 'Julia Package Butler Updates',
        head: 'julia-pkgbutler-updates',
        base: 'master'
      })
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
