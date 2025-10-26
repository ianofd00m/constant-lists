// Card type mapping for basic demo (expand as needed)
// Expanded with more hints, but main logic will use type_line parsing
export const CARD_TYPE_HINTS = {
  'Island': 'Land',
  'Mountain': 'Land',
  'Plains': 'Land',
  'Swamp': 'Land',
  'Forest': 'Land',
  'Wastes': 'Land',
  'Halimar Depths': 'Land',
  'Izzet Boilerworks': 'Land',
  'Lonely Sandbar': 'Land',
  'Remote Isle': 'Land',
  'Temple of Epiphany': 'Land',
  'Accumulated Knowledge': 'Instant',
  'Brainstorm': 'Instant',
  'Dandân': 'Creature',
  'Diminishing Returns': 'Sorcery',
  'Foil': 'Instant',
  'Magical Hack': 'Instant',
  'Memory Lapse': 'Instant',
  'Mental Note': 'Instant',
  'Mind Bend': 'Instant',
  'Miscalculation': 'Instant',
  'Mystic Retrieval': 'Sorcery',
  'Portent': 'Sorcery',
  'Ray of Command': 'Instant',
  'Supplant Form': 'Instant',
  'Telling Time': 'Instant',
  'Vision Charm': 'Instant',
  // Add more as needed
};

// Helper: parse type_line for main type
export function getMainCardType(typeLine) {
  if (!typeLine || typeof typeLine !== 'string') return 'Other';
  // Look for main types in order of importance
  const mainTypes = [
    'Commander', // custom
    'Creature',
    'Planeswalker',
    'Battle',
    'Sorcery',
    'Instant',
    'Artifact',
    'Kindred',
    'Enchantment',
    'Land',
    'Conspiracy',
    'Dungeon',
    'Emblem',
    'Hero',
    'Phenomenon',
    'Plane',
    'Scheme',
    'Vanguard',
  ];
  for (const t of mainTypes) {
    if (typeLine.includes(t)) return t;
  }
  // Fallback: use first word before em dash or first word
  return typeLine.split('—')[0].trim().split(' ')[0] || 'Other';
}
