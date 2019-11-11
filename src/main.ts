import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
const uuidv4 = require('uuid/v4');

async function run() {
  try {
    const GITHUB_TOKEN = core.getInput('github-token', { required: true });
    const REMOTE_REPO = `https://${process.env.GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
    const LOCAL_BRANCH_NAME = uuidv4();

    const octokit = new github.GitHub(GITHUB_TOKEN);

    await exec.exec('git', ['config', '--global', 'user.name', '"Julia Package Butler"'])
    await exec.exec('git', ['config', '--global', 'user.email', '"<>"'])

    await exec.exec('git', ['remote', 'add', 'publisher', REMOTE_REPO]);

    await exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButler.jl", rev="master"))']);

    await exec.exec('git', ['checkout', '-b', LOCAL_BRANCH_NAME])

    await exec.exec('julia', ['--color=yes', '-e', 'import PkgButler; PkgButler.update_pkg(pwd())']);

    await exec.exec('git', ['add', '-A', '.'])

    // This is a workaround describe at https://stackoverflow.com/questions/3878624/how-do-i-programmatically-determine-if-there-are-uncommitted-changes
    await exec.exec('git', ['diff'])
    
    let ret_code = 0
    try {
      ret_code = await exec.exec('git', ['diff-index', '--cached', '--quiet', 'HEAD']);
    } catch (error) {
      ret_code = 1
    }

    if (ret_code != 0) {
      console.log('Julia Package Butler found things that need to be fixed on master.')

      await exec.exec('git', ['commit', '-m', '"Julia Package Butler updates"'])

      let ret_code2 = 0;
      try {
        ret_code2 = await exec.exec('git', ['diff', LOCAL_BRANCH_NAME, 'remotes/origin/julia-pkgbutler-updates', '--exit-code', '--quiet'])
      } catch (error) {
        ret_code2 = 1
      }

      if (ret_code2 != 0) {
        console.log('Julia Package Butler found things that need to be fixed on master that are not yet on the julia-pkgbutler-update branch.')

        await exec.exec('git', ['push', '-f', 'publisher', `${LOCAL_BRANCH_NAME}:julia-pkgbutler-updates`])

        try {
          await octokit.pulls.create({
            ...github.context.repo,
            title: 'Julia Package Butler Updates',
            head: 'julia-pkgbutler-updates',
            base: 'master',
            body: 'The Julia Package Butler suggests these changes.'
          })
          console.log('Julia Package Butler succesfully created a new PR.')
        } catch (error) {
          console.log('Julia Package Butler was not able to create a new PR.')
        }
      } else {
        console.log('Julia Package Butler found that all necessary changes are already on the julia-pkgbutler-update branch.')
      }
    } else {
      console.log('Julia Package Butler found nothing that needs to be updated on master.')
      try {
        await exec.exec('git', ['push', 'publisher', '--delete', 'julia-pkgbutler-updates'])
        console.log('Julia Package Butler succesfully deleted the branch julia-pkgbutler-updates.')
      } catch (error) {
        console.log('Julia Package Butler was not able to delete the branch julia-pkgbutler-updates.')
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
