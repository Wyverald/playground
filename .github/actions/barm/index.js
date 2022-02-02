const core = require('@actions/core');
const github = require('@actions/github');

const RELEASE_BLOCKER = "potential release blocker";

async function run() {
  const token = core.getInput("token");
  const octokit = github.getOctokit(token);

  const payload = github.context.payload;
  const command = payload.comment.body.slice(6);  // "!barm "

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  if (command.startsWith("fork ")) {
    // Check if the commenter is a collaborator of the repo
    try {
      await octokit.rest.repos.checkCollaborator({
        owner,
        repo,
        username: payload.comment.user.login,
      });
    } catch (err) {
      throw `user ${payload.comment.user.login} has no collaborator access in repo ${owner}/${repo}`;
    }

    // Find the milestone corresponding to this branch
    const branch = command.slice(5);
    var milestoneNumber = null;
    for await (const milestone of octokit.paginate.iterator(
      octokit.rest.issues.listMilestones,
      {owner, repo}
    )) {
core.info(`found milestone: [${milestone.title}]`);
      if (milestone.title === `${branch} release blockers`) {
        milestoneNumber = milestone.number;
        break;
      }
    }
    if (milestoneNumber === null) {
      throw `no release blocker milestone found for ${branch}`;
    }

    // Create an issue on this milestone
    await octokit.rest.issues.create({
      owner,
      repo,
      title: `[${branch}] ` + payload.issue.title,
      body: `Forked from #${payload.issue.number}`,
      milestone: milestoneNumber,
    });

    // Remove the "potential release blocker" label if it's present
    if (payload.issue.labels.some(label => label.name === FLAGGED_LABEL)) {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: payload.issue.number,
        name: FLAGGED_LABEL,
      });
    }
  } else if (command === "flag") {
    await octokit.rest.issues.addLabel({
      owner,
      repo,
      issue_number: payload.issue.number,
      name: FLAGGED_LABEL,
    });
  }

}

run().then(
  result => { core.info(result); },
  err => { core.setFailed(err); }
);
