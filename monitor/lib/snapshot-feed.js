function fingerprintOf(snapshot) {
  return JSON.stringify({ projects: snapshot.projects, sessions: snapshot.sessions });
}

function createSnapshotFeed({ buildSnapshot, intervalMs, onChange, onError }) {
  let latest = null;
  let latestFingerprint = null;
  let timer = null;

  function refresh() {
    let snapshot;
    try {
      snapshot = buildSnapshot();
    } catch (error) {
      onError(error);
      return;
    }
    latest = snapshot;
    const fingerprint = fingerprintOf(snapshot);
    if (fingerprint === latestFingerprint) return;
    latestFingerprint = fingerprint;
    onChange(snapshot);
  }

  function start() {
    refresh();
    timer = setInterval(refresh, intervalMs);
  }

  function stop() {
    clearInterval(timer);
  }

  return { start, stop, latest: () => latest };
}

module.exports = { createSnapshotFeed };
