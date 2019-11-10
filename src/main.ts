import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import * as uuids from 'uuid/v4'

async function run() {
  try {
    const GITHUB_TOKEN = core.getInput('github-token', { required: true });
    const REMOTE_REPO = `https://${process.env.GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
    const LOCAL_BRANCH_NAME = uuids.uuid4();

    const octokit = new github.GitHub(GITHUB_TOKEN);

    await exec.exec('git', ['remote', 'add', 'publisher', REMOTE_REPO]);

    await exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButler.jl", rev="master"))']);

    await exec.exec('git', ['checkout', '-b', LOCAL_BRANCH_NAME])

    await exec.exec('julia', ['--color=yes', '-e', 'import PkgButler; PkgButler.update_pkg(pwd())']);

    let ret_code = await exec.exec('git', ['diff-index', '--quiet', 'HEAD', '--']);

    if (ret_code != 1) {
      await exec.exec('git', ['config', '--global', 'user.name', '"Julia Package Butler"'])
      await exec.exec('git', ['config', '--global', 'user.email', '"<>"'])

      await exec.exec('git', ['add', '.'])

      await exec.exec('git', ['commit', '-m', '"Julia Package Butler updates"'])

      let ret_code2 = await exec.exec('git', ['diff', LOCAL_BRANCH_NAME, 'remotes/origin/julia-pkgbutler-updates', '--exit-code', '--quiet'])

      if (ret_code2 != 0) {
        await exec.exec('git', ['push', '-f', 'publisher', `${LOCAL_BRANCH_NAME}:julia-pkgbutler-updates`])

        try {
          await octokit.pulls.create({
            ...github.context.repo,
            title: 'Julia Package Butler Updates',
            head: 'julia-pkgbutler-updates',
            base: 'master',
            body: 'The Julia Package Butler suggests these changes.'
          })
        } catch (error) {
          console.log('Something went wrong trying to create PR.')
        }
      }
    } else {
      try {
        await exec.exec('git', ['push', 'publisher', '--delete', 'julia-pkgbutler-updates'])
      } catch (error) {
        console.log('Something went wrong trying to delete remote branch.')
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
