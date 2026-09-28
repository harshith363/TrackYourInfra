const configuredRepo = import.meta.env.PUBLIC_GITHUB_REPO?.trim() ?? '';

export const githubRepo = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configuredRepo) ? configuredRepo : null;
export const githubBase = githubRepo ? `https://github.com/${githubRepo}` : null;
export const issueChooserUrl = githubBase ? `${githubBase}/issues/new/choose` : null;
export const issuesUrl = githubBase ? `${githubBase}/issues` : null;
