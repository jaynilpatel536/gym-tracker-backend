/**
 * Compares the current workout's sets against the most recent previous
 * logged session for the same exercise, and suggests a progression.
 *
 * previousSets / currentSets: [{ setNumber, weightKg, reps, completed }]
 */
function suggestProgression(previousSets = [], currentSets = []) {
  const filterCompleted = (sets) =>
    (sets || []).filter((s) => s && s.completed !== false && (s.weightKg > 0 || s.reps > 0));

  const validPrev = filterCompleted(previousSets);
  const validCurr = filterCompleted(currentSets);

  if (!validPrev.length && !validCurr.length) {
    return { suggestion: 'No workout data yet', isPersonalRecord: false, prevVolume: 0, currVolume: 0, prevMaxWeight: 0, currMaxWeight: 0 };
  }

  if (!validPrev.length && validCurr.length) {
    const currVolume = validCurr.reduce((sum, s) => sum + (s.weightKg || 0) * (s.reps || 0), 0);
    const currMaxWeight = Math.max(0, ...validCurr.map((s) => s.weightKg || 0));
    return {
      suggestion: 'Inaugural session logged! Aim to increase weight or reps next time.',
      isPersonalRecord: true,
      prevVolume: 0,
      currVolume,
      prevMaxWeight: 0,
      currMaxWeight,
    };
  }

  const totalVolume = (sets) =>
    sets.reduce((sum, s) => sum + (s.weightKg || 0) * (s.reps || 0), 0);

  const maxWeight = (sets) => Math.max(0, ...sets.map((s) => s.weightKg || 0));

  const prevVolume = totalVolume(validPrev);
  const currVolume = totalVolume(validCurr);
  const prevMaxWeight = maxWeight(validPrev);
  const currMaxWeight = maxWeight(validCurr);

  const isPersonalRecord = currVolume > prevVolume || currMaxWeight > prevMaxWeight;

  let suggestion;
  if (currVolume > prevVolume || currMaxWeight > prevMaxWeight) {
    suggestion = 'Increase Weight';
  } else if (currVolume === prevVolume && currVolume > 0) {
    suggestion = 'Increase Reps';
  } else {
    suggestion = 'Keep Same Weight';
  }

  return { suggestion, isPersonalRecord, prevVolume, currVolume, prevMaxWeight, currMaxWeight };
}

module.exports = { suggestProgression };
