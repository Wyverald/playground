const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  const token = core.getInput("token");
  const octokit = github.getOctokit(token);

  const payload = github.context.payload;
  const command = payload.comment.body.slice(6);  // "!barm "

  await octokit.rest. issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    body: "hi! your command was: `" + command + "`"
  });

}

run();
