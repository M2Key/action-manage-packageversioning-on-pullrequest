const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {

        isTitleShouldContainPackageVersionIncrementation = core.getInput('isTitleShouldContainPackageVersionIncrementation', { required: true });
        const title = github.context.payload.pull_request.title;
        core.debug(`title: ${title}`);

        const titleRegex = /(\+semver:\s?(breaking|major)|\+semver:\s?(feature|minor)|\+semver:\s?(fix|patch)|\+semver:\s?(none|skip))/;
        const matches = titleRegex.test(title);
        if (isTitleShouldContainPackageVersionIncrementation && !matches) {
            core.setFailed('Pull request title does not match given regex, it should include either one of this option : [+semver: breaking|major, +semver: feature|minor, +semver: fix|patch, +semver: none|skip] ');
            return;
        }
        if (!isTitleShouldContainPackageVersionIncrementation && matches) {
            core.setFailed('Pull request title should not include one of this : [+semver: breaking|major, +semver: feature|minor, +semver: fix|patch, +semver: none|skip] if the library was not updated');
            return;
        }
    }
    catch (error) {
        core.error(error);
        core.setFailed(error.message);
    }
}

run();