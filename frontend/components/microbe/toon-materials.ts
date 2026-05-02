/**
 * Shared toon (cel-shading) gradient texture for MeshToonMaterial.
 *
 * Three.js MeshToonMaterial requires a DataTexture whose pixel values define
 * where the shading bands appear. NearestFilter sampling ensures the bands are
 * crisp and sharp rather than smoothly interpolated — this is the key visual
 * difference between toon and standard shading.
 *
 * 3-band layout (dark → mid → light):
 *   pixel 0 → value  80  (shadow — ≈31% brightness)
 *   pixel 1 → value 160  (mid-tone — ≈63% brightness)
 *   pixel 2 → value 240  (highlight — ≈94% brightness)
 */

import { DataTexture, RedFormat, NearestFilter } from "three"

let _cached: DataTexture | null = null

/**
 * Returns a lazily-created, module-level singleton toon gradient DataTexture.
 * Safe to call at module load time — DataTexture is pure JS, no WebGL required.
 * @returns DataTexture with 3-band toon gradient and NearestFilter sampling
 */
export function getToonGradient(): DataTexture {
  if (_cached) return _cached

  const data = new Uint8Array([80, 160, 240])
  const texture = new DataTexture(data, 3, 1, RedFormat)
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.needsUpdate = true

  _cached = texture
  return _cached
}
