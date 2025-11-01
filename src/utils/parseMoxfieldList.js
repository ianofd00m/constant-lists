// Utility to parse Moxfield/MTG text decklists
// Returns [{ name, set, collectorNumber, foil, quantity }]
export function parseMoxfieldList(listText) {
  const lines = listText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = [];
  const lineRegex = /^(\d+)\s+(.+?)\s+\(([^)]+)\)\s+(\S+)(?:\s+\*F\*)?$/i;
  const foilRegex = /\*F\*/i;
  for (const line of lines) {
    // Example: 1 The Watcher in the Water (LTR) 75 *F*
    const foil = foilRegex.test(line);
    const match = line.match(lineRegex);
    if (match) {
      const [, count, name, set, collectorNumber] = match;
      result.push({
        quantity: parseInt(count, 10),
        name: name.trim(),
        set: set.trim(),
        collectorNumber: collectorNumber.trim(),
        foil
      });
    }
  }
  return result;
}
