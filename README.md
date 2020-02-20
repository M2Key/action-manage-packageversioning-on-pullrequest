# Manage package versioning on pullrequest title

This action update pullrequest title including library version calculated based on old pullrequest title if library updated

## Inputs

### `githubToken`

**Required** The github token passed with secret.
### `libraryPath`

**Required** the library path to determine if library was update on the pull request.


## Example usage
```
uses: M2Key/action-manage-packageversioning-on-pullrequest@v1
with:
  libraryPath: 'PrizeSystemLibrary'
  githubToken: ${{ secrets.GITHUB_TOKEN }}
```