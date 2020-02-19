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

        const myToken = core.getInput('githubToken');
        const octokit = new github.GitHub(myToken);


        repo = github.context.repo;

        const getDatas = async function (page = 1) {

            let data = await octokit.pulls.list({
                owner: 'M2Key',
                repo: repo,
                base: 'preprod',
                per_page: 50,
                page: page,
                state: 'all'
            }).then(({ data }) => {
                return data;
            }).catch(err => {
                reject(err);
            });
            return data;
        };

        const getEntirePullList = async function (pageNo = 1) {
            const results = await getDatas(pageNo);
            console.log("Retreiving data from API for page : " + pageNo);
            console.log("results lenght" + results.length);
            if (results.length === 50) {
                return results.concat(await getEntirePullList(pageNo + 1));
            } else {
                return results;
            }
        };

        (async () => {

            const entireList = await getEntirePullList();
            console.log('entireList lenght : ', entireList.length);
            const mergedPullRequestTitles = entireList.filter(pull => pull.state === 'closed' && pull.merged_at !== null).map(pull => pull.title);
            let version = baseVersion;
            console.log(' version : ', version);
            mergedPullRequestTitles.reverse().forEach(pullTitle => {

                console.log(' pullTitle : ', pullTitle);
                if (pullTitle.includes('+semver: major') || pullTitle.includes('+semver: breaking')) {
                    version = incrementVersion(version, 'major');
                    console.log(` increment major version (${version})`);
                }
                else if (pullTitle.includes('+semver: feature') || pullTitle.includes('+semver: minor')) {
                    version = incrementVersion(version, 'minor');
                    console.log(` increment minor version (${version})`);
                }
                else if (pullTitle.includes('+semver: fix') || pullTitle.includes('+semver: patch')) {
                    version = incrementVersion(version, 'patch');
                    console.log(` increment patch version (${version})`);
                }
                else {
                    console.log(` no increment version (${version})`);
                }
            });
        })();

        // add version to pull request title
        const request = {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: github.context.payload.pull_request.number
        };

        const updateTitle = title + ` #version:${version}`;
        request.title = updateTitle;
        request.body = '';
        core.debug(`new title: ${request.title}`);

        octokit.pulls.update(request).then(response => {
            core.debug(`update pull request response: ${response}`);
        });
    }
    catch (error) {
        core.error(error);
        core.setFailed(error.message);
    }
}

function incrementVersion(version, incrementation) {
    let versionSplit = version.split('.').map(Number);
    switch (incrementation) {
        case 'major':
            versionSplit[0] += 1;
            versionSplit[1] = 0;
            versionSplit[2] = 0;
            break;
        case 'minor':
            versionSplit[1] += 1;
            versionSplit[2] = 0;
            break;
        case 'patch':
            versionSplit[2] += 1;
            break;
    }

    return versionSplit.join('.');
}

run();