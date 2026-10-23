const ACTIVE_STATE = 'active';

function describedAgents(agents) {
  return agents.filter((agent) => agent.description !== '');
}

function latestBy(agents, timeOf) {
  return agents.reduce((best, agent) => (best === null || timeOf(agent) > timeOf(best) ? agent : best), null);
}

function titleFrom(agent, source) {
  return agent === null ? null : { taskTitle: agent.description, taskTitleSource: source };
}

function fromAgents(agents) {
  const described = describedAgents(agents);
  const active = latestBy(described.filter((agent) => agent.state === ACTIVE_STATE), (agent) => agent.lastActivityAt || 0);
  return titleFrom(active, 'active-agent')
    || titleFrom(latestBy(described, (agent) => agent.spawnedAt || 0), 'recent-agent');
}

function resolveTaskTitle(agents, transcriptState) {
  if (agents.length > 0) {
    return fromAgents(agents) || { taskTitle: null, taskTitleSource: null };
  }
  if (transcriptState.aiTitle) return { taskTitle: transcriptState.aiTitle, taskTitleSource: 'ai-title' };
  return { taskTitle: null, taskTitleSource: null };
}

module.exports = { resolveTaskTitle };
