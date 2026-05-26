const GRADIENTS = [
  'linear-gradient(135deg, #EC4899, #F43F5E)', // pink to rose
  'linear-gradient(135deg, #7C3AED, #4F46E5)', // violet to indigo
  'linear-gradient(135deg, #3B82F6, #06B6D4)', // blue to cyan
  'linear-gradient(135deg, #34D399, #059669)', // emerald to green
  'linear-gradient(135deg, #FBBF24, #EA580C)', // amber to orange
  'linear-gradient(135deg, #8B5CF6, #D946EF)', // purple to fuchsia
  'linear-gradient(135deg, #EF4444, #F97316)', // red to orange
];

const AVATAR_CHARACTERS = [
  '🦊', '🐼', '🦁', '🐨', '🦄', '🐰', '🐱', '🐶', '🐸', '🐙',
  '🐵', '🐥', '🦖', '🐉', '🤖', '👾', '👽', '👻', '🧙', '🥷',
  '🍕', '🥑', '🌮', '🧁', '🍩', '🚀', '🛸', '🎨', '🎮', '🎸'
];

/**
 * Deterministically generates avatar styles based on a seed string (e.g. nickname).
 */
export function getAvatarData(seed: string, indexOffset = 0) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash + indexOffset);

  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const character = AVATAR_CHARACTERS[hash % AVATAR_CHARACTERS.length];

  return {
    gradient,
    character,
  };
}

export function getRandomAvatarIndex(): number {
  return Math.floor(Math.random() * 100);
}
