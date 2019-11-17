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
const io = __importStar(require("@actions/io"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const child_process = __importStar(require("child_process"));
const uuidv4 = require('uuid/v4');
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const home = process.env['HOME'];
            const homeSsh = home + '/.ssh';
            console.log(`Adding GitHub.com keys to ${homeSsh}/known_hosts`);
            yield io.mkdirP(homeSsh);
            fs.appendFileSync(`${homeSsh}/known_hosts`, '\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n');
            fs.appendFileSync(`${homeSsh}/known_hosts`, '\ngithub.com ssh-dss AAAAB3NzaC1kc3MAAACBANGFW2P9xlGU3zWrymJgI/lKo//ZW2WfVtmbsUZJ5uyKArtlQOT2+WRhcg4979aFxgKdcsqAYW3/LS1T2km3jYW/vr4Uzn+dXWODVk5VlUiZ1HFOHf6s6ITcZvjvdbp6ZbpM+DuJT7Bw+h5Fx8Qt8I16oCZYmAPJRtu46o9C2zk1AAAAFQC4gdFGcSbp5Gr0Wd5Ay/jtcldMewAAAIATTgn4sY4Nem/FQE+XJlyUQptPWMem5fwOcWtSXiTKaaN0lkk2p2snz+EJvAGXGq9dTSWHyLJSM2W6ZdQDqWJ1k+cL8CARAqL+UMwF84CR0m3hj+wtVGD/J4G5kW2DBAf4/bqzP4469lT+dF2FRQ2L9JKXrCWcnhMtJUvua8dvnwAAAIB6C4nQfAA7x8oLta6tT+oCk2WQcydNsyugE8vLrHlogoWEicla6cWPk7oXSspbzUcfkjN3Qa6e74PhRkc7JdSdAlFzU3m7LMkXo1MHgkqNX8glxWNVqBSc0YRdbFdTkL0C6gtpklilhvuHQCdbgB3LBAikcRkDp+FCVkUgPC/7Rw==\n');
            console.log("Starting ssh-agent");
            const authSock = '/tmp/ssh-auth.sock'; // core.getInput('ssh-auth-sock');
            yield exec.exec('ssh-agent', ['-a', authSock]);
            core.exportVariable('SSH_AUTH_SOCK', authSock);
            console.log("Adding private key to agent");
            const ssh_key_decoded = Buffer.from(core.getInput('ssh-private-key'), 'base64').toString('ascii');
            child_process.execSync('ssh-add -', { input: ssh_key_decoded });
            const channel = core.getInput('channel');
            const GITHUB_TOKEN = core.getInput('github-token', { required: true });
            const REMOTE_REPO = `git@github.com:${process.env.GITHUB_REPOSITORY}.git`;
            const LOCAL_BRANCH_NAME = uuidv4();
            const octokit = new github.GitHub(GITHUB_TOKEN);
            yield exec.exec('git', ['config', '--global', 'user.name', '"Julia Package Butler"']);
            yield exec.exec('git', ['config', '--global', 'user.email', '"<>"']);
            yield exec.exec('git', ['remote', 'add', 'publisher', REMOTE_REPO]);
            if (channel == 'dev') {
                yield exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(name="PkgButlerEngine", rev="master"))']);
            }
            else if (channel === undefined || channel == 'stable') {
                yield exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add("PkgButlerEngine")']);
            }
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
