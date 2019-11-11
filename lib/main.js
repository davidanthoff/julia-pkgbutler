"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const github = __importStar(require("@actions/github"));
const uuidv4 = require('uuid/v4');
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const GITHUB_TOKEN = core.getInput('github-token', { required: true });
            const REMOTE_REPO = `https://${process.env.GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
            const LOCAL_BRANCH_NAME = uuidv4();
            const octokit = new github.GitHub(GITHUB_TOKEN);
            yield exec.exec('git', ['config', '--global', 'user.name', '"Julia Package Butler"']);
            yield exec.exec('git', ['config', '--global', 'user.email', '"<>"']);
            yield exec.exec('git', ['remote', 'add', 'publisher', REMOTE_REPO]);
            yield exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButlerEngine.jl", rev="master"))']);
            yield exec.exec('git', ['checkout', '-b', LOCAL_BRANCH_NAME]);
            yield exec.exec('julia', ['--color=yes', '-e', 'import PkgButlerEngine; PkgButlerEngine.update_pkg(pwd())']);
            yield exec.exec('git', ['add', '-A', '.']);
            // This is a workaround describe at https://stackoverflow.com/questions/3878624/how-do-i-programmatically-determine-if-there-are-uncommitted-changes
            yield exec.exec('git', ['diff']);
            let ret_code = 0;
            try {
                ret_code = yield exec.exec('git', ['diff-index', '--cached', '--quiet', 'HEAD']);
            }
            catch (error) {
                ret_code = 1;
            }
            if (ret_code != 0) {
                console.log('Julia Package Butler found things that need to be fixed on master.');
                yield exec.exec('git', ['commit', '-m', 'Fix issues identified by Julia Package Butler']);
                let ret_code2 = 0;
                try {
                    ret_code2 = yield exec.exec('git', ['diff', LOCAL_BRANCH_NAME, 'remotes/origin/julia-pkgbutler-updates', '--exit-code', '--quiet']);
                }
                catch (error) {
                    ret_code2 = 1;
                }
                if (ret_code2 != 0) {
                    console.log('Julia Package Butler found things that need to be fixed on master that are not yet on the julia-pkgbutler-update branch.');
                    yield exec.exec('git', ['push', '-f', 'publisher', `${LOCAL_BRANCH_NAME}:julia-pkgbutler-updates`]);
                    try {
                        yield octokit.pulls.create(Object.assign(Object.assign({}, github.context.repo), { title: 'Julia Package Butler Updates', head: 'julia-pkgbutler-updates', base: 'master', body: 'The Julia Package Butler suggests these changes.' }));
                        console.log('Julia Package Butler succesfully created a new PR.');
                    }
                    catch (error) {
                        console.log('Julia Package Butler was not able to create a new PR.');
                    }
                }
                else {
                    console.log('Julia Package Butler found that all necessary changes are already on the julia-pkgbutler-update branch.');
                }
            }
            else {
                console.log('Julia Package Butler found nothing that needs to be updated on master.');
                try {
                    yield exec.exec('git', ['push', 'publisher', '--delete', 'julia-pkgbutler-updates']);
                    console.log('Julia Package Butler succesfully deleted the branch julia-pkgbutler-updates.');
                }
                catch (error) {
                    console.log('Julia Package Butler was not able to delete the branch julia-pkgbutler-updates.');
                }
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
