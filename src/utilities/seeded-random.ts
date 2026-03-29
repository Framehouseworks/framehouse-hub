/**
 * A simple Linear Congruential Generator (LCG) for deterministic pseudorandomness.
 * This ensures that server-side rendering and client-side hydration produce 
 * identical results for a given seed.
 */
export const createSeededRandom = (seed: string | number) => {
  // Convert string seed to number if necessary
  let s = typeof seed === 'string' 
    ? Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0) 
    : seed

  // LCG parameters (common values)
  const m = 0x80000000 // 2^31
  const a = 1103515245
  const c = 12345

  return () => {
    s = (a * s + c) % m
    return s / (m - 1)
  }
}

/**
 * Returns a stable shuffled version of an array based on a seed.
 */
export const seededShuffle = <T>(array: T[], seed: string | number): T[] => {
  const random = createSeededRandom(seed)
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
