/**
 * Without this file Zephyr derives org and project from the git remote, and the
 * app would land under `goul4rt` (the GitHub account that owns the repository)
 * instead of the product's own organization.
 */
module.exports = {
  org: 'questoes',
  project: 'questiona',
  appName: 'questiona',
};
