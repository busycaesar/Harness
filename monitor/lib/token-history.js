const DEFAULT_MAX_SAMPLES = 60;

// A sample is kept only when the total moved, so an idle box neither grows its series nor changes
// the snapshot fingerprint, which is what stops the page re-rendering every second for nothing.
// Each sample carries its own time, so a gap in the series is a real idle stretch.
function createTokenHistory({ maxSamples = DEFAULT_MAX_SAMPLES } = {}) {
  const seriesByKey = new Map();
  const seenKeys = new Set();

  function sample(key, total, at) {
    seenKeys.add(key);
    const series = seriesByKey.get(key) || [];
    const last = series[series.length - 1];
    if (last === undefined || last[1] !== total) {
      series.push([at, total]);
      if (series.length > maxSamples) series.splice(0, series.length - maxSamples);
      seriesByKey.set(key, series);
    }
    return series.slice();
  }

  // a box that has left the snapshot keeps no history, so a long-lived server does not grow forever
  function forgetUnseen() {
    for (const key of [...seriesByKey.keys()]) {
      if (!seenKeys.has(key)) seriesByKey.delete(key);
    }
    seenKeys.clear();
  }

  return { sample, forgetUnseen };
}

module.exports = { createTokenHistory };
