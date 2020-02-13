const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const title = github.context.payload.pull_request.title;
        core.debug(`title: ${title}`);

        const titleRegex = /(\+semver:\s?(breaking|major)|\+semver:\s?(feature|minor)|\+semver:\s?(fix|patch)|\+semver:\s?(none|skip))/;
        const matches = titleRegex.test(title);
        if (!matches) {
            core.setFailed('Pull request title does not match given regex, it should include either one of this option : [+semver: breaking, +semver: feature, +semver: fix, +semver: none] ');
            return;
        }
    }
    catch (error) {
        core.error(error);
        core.setFailed(error.message);
    }
}

run();