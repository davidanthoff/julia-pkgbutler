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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const GITHUB_TOKEN = core.getInput('github-token', { required: true });
            const REMOTE_REPO = `https://${process.env.GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
            const octokit = new github.GitHub(GITHUB_TOKEN);
            yield exec.exec('julia', ['--color=yes', '-e', 'using Pkg; Pkg.add(PackageSpec(url="https://github.com/davidanthoff/PkgButler.jl", rev="master"))']);
            // TODO Handle this in a better way
            try {
                yield exec.exec('git', ['branch', '-D', 'julia-pkgbutler-updates']);
            }
            catch (error) {
            }
            yield exec.exec('git', ['checkout', '-b', 'julia-pkgbutler-updates']);
            yield exec.exec('julia', ['--color=yes', '-e', 'import PkgButler; PkgButler.update_pkg(pwd())']);
            let ret_code = yield exec.exec('git', ['diff-index', '--quiet', 'HEAD', '--']);
            if (ret_code != 1) {
                yield exec.exec('git', ['config', '--global', 'user.name', '"Julia Package Butler"']);
                yield exec.exec('git', ['config', '--global', 'user.email', '"<>"']);
                yield exec.exec('git', ['add', '.']);
                yield exec.exec('git', ['commit', '-m', '"Julia butler updates"']);
                yield exec.exec('git', ['remote', 'add', 'publisher', REMOTE_REPO]);
                yield exec.exec('git', ['push', '-f', 'publisher', 'julia-pkgbutler-updates']);
                octokit.pulls.create(Object.assign(Object.assign({}, github.context.repo), { title: 'Julia Package Butler Updates', head: 'julia-pkgbutler-updates', base: 'master' }));
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
