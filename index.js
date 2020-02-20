const core = require('@actions/core');
const github = require('@actions/github');

function run() {

    const title = github.context.payload.pull_request.title;
    const libraryPath = core.getInput('libraryPath', { required: true });
    const myToken = core.getInput('githubToken');
    const octokit = new github.GitHub(myToken);
    const repo = github.context.repo.repo;
    const owner = github.context.repo.owner;

    // Method : Get all file changes of pull request to determine library was updated
    const getFilesChanges = async function (page = 1) {
        let data = await octokit.pulls.listFiles({
            owner: owner,
            repo: repo,
            pull_number: github.context.payload.pull_request.number,
            per_page: 50,
            page: page
        }).then(({ data }) => {
            return data;
        }).catch(err => {
            core.setFailed(err.toString());
        });
        return data;
    };

    const getEntireFilesChangesList = async function (pageNo = 1) {
        const results = await getFilesChanges(pageNo);
        console.log("Retreiving data from API for page : " + pageNo);
        console.log("results lenght" + results.length);
        if (results.length === 50) {
            return results.concat(await getEntireFilesChangesList(pageNo + 1));
        } else {
            return results;
        }
    };


    // Method : Get all pullrequest to calculate library version
    const getDatas = async function (page = 1) {
        let data = await octokit.pulls.list({
            owner: owner,
            repo: repo,
            base: 'preprod',
            per_page: 50,
            page: page,
            state: 'all'
        }).then(({ data }) => {
            return data;
        }).catch(err => {
            core.setFailed(err.toString());
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


    // Implementation : Get all file changes of pull request to determine library was updated
    (async () => {

        const entireFilesChangesList = await getEntireFilesChangesList();
        console.log('entireFilesChangesList lenght : ', entireFilesChangesList.length);
        console.log('entireFilesChangesList : ', entireFilesChangesList);

        let isLibraryUpdated = false;
        entireFilesChangesList.map(fileChange => fileChange.filename).forEach(filename => {
            console.log('test filename : ', filename, ' contain ', libraryPath);
            if (filename.startsWith(`${libraryPath}/`)) {
                isLibraryUpdated = true;
                console.log('library updated');
            }

        });

        return isLibraryUpdated;
    })().then(isLibraryUpdated => {
        console.log(' library updated : ', isLibraryUpdated);
        const titleRegex = /(\+semver:\s?(breaking|major)|\+semver:\s?(feature|minor)|\+semver:\s?(fix|patch)|\+semver:\s?(none|skip))/;
        const matches = titleRegex.test(title);

        if (isLibraryUpdated) {

            if (!matches) {
                core.setFailed('Pull request title does not match given regex, it should include either one of this option : [+semver: breaking|major, +semver: feature|minor, +semver: fix|patch, +semver: none|skip] ');
                return;
            }

            // Implementation : Get all pullrequest to calculate library version

            (async () => {

                const entireList = await getEntirePullList();
                console.log('entireList lenght : ', entireList.length);
                const mergedPullRequestTitles = entireList.filter(pull => pull.state === 'closed' && pull.merged_at !== null).map(pull => pull.title);
                let version = '1.0.0';
                console.log(' version : ', version);
                mergedPullRequestTitles.reverse().forEach(pullTitle => {

                    console.log(' pullTitle : ', pullTitle);
                    determineVersionIncrementation(pullTitle, version);
                });
                determineVersionIncrementation(title, version);
                return version;
            })().then(version => {
                console.log(' version final : ', version);
                // add version to pull request title
                const request = {
                    owner: owner,
                    repo: repo,
                    pull_number: github.context.payload.pull_request.number
                };

                const versionRegex = /(?<=#version)(\d+\.?)+/;
                let versionFound = versionRegex.exec(title);
                let updateTitle = title;
                if (versionFound) {
                    updateTitle.replace(`#version:${versionFound[0]}`, '');
                }

                updateTitle += ` #version:${version}`;
                request.title = updateTitle;
                request.body = '';

                core.debug(`new title: ${request.title}`);

                octokit.pulls.update(request).then(({ data }) => {
                    core.debug(`update pull request response: ${data}`);
                }).catch(err => {
                    core.setFailed(err.toString());
                });
            }).catch(err => {
                core.setFailed(err.toString());
            });
        }
        else {
            if (matches) {
                core.setFailed('Pull request title should not include one of this : [+semver: breaking|major, +semver: feature|minor, +semver: fix|patch, +semver: none|skip] if the library was not updated');
                return;
            }
        }

    }).catch(err => {
        core.setFailed(err.toString());
    });


}

function determineVersionIncrementation(title, version) {
    if (title.includes('+semver: major') || title.includes('+semver: breaking')) {
        version = incrementVersion(version, 'major');
        console.log(` increment major version (${version})`);
    }
    else if (title.includes('+semver: feature') || title.includes('+semver: minor')) {
        version = incrementVersion(version, 'minor');
        console.log(` increment minor version (${version})`);
    }
    else if (title.includes('+semver: fix') || title.includes('+semver: patch')) {
        version = incrementVersion(version, 'patch');
        console.log(` increment patch version (${version})`);
    }
    else {
        console.log(` no increment version (${version})`);
    }

    return version;
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
try {
    run();
} catch (err) {
    core.setFailed(err.toString());
}
