import * as THREE from 'three';
import { FloorFinish } from '../types';

/**
 * Generates procedural canvas textures with SRGBColorSpace, dark refined luxury hues, and high visual fidelity.
 */
export function createFloorCanvasTexture(kind: FloorFinish, maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(c);

  if (kind === 'nero-marquina') {
    // Ultra-luxury Nero Marquina Deep Black Marble with striking white and gold veins
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle cloudiness in dark charcoal
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = 'rgba(28, 33, 44, 0.2)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 12, 12);
    }

    // High-definition white calcite veins
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let s = 0; s < 14; s++) {
        x += (Math.random() - 0.38) * 50;
        y += (Math.random() - 0.42) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Secondary delicate gold mineral vein lines
    ctx.strokeStyle = 'rgba(217, 145, 30, 0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let s = 0; s < 10; s++) {
        x += (Math.random() - 0.35) * 60;
        y += (Math.random() - 0.4) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (kind === 'smoked-oak') {
    // Dark Smoked Espresso Oak Herringbone Planks
    ctx.fillStyle = '#221914';
    ctx.fillRect(0, 0, 512, 512);
    const shades = ['#2b2019', '#241a14', '#32261e', '#1c140f'];
    for (let y = 0; y < 512; y += 32) {
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = shades[(x + y) % shades.length];
        ctx.fillRect(x + 1, y + 1, 126, 30);
        // Fine grain lines
        ctx.fillStyle = 'rgba(10, 6, 4, 0.25)';
        ctx.fillRect(x + 8, y + 6, 110, 1.5);
        ctx.fillRect(x + 20, y + 18, 90, 1.2);
        ctx.fillStyle = 'rgba(200, 150, 100, 0.08)';
        ctx.fillRect(x + 15, y + 24, 70, 1.0);
      }
    }
  } else if (kind === 'charcoal-basalt') {
    // Dark Flamed Charcoal Basalt / Volcanic Architectural Tile
    ctx.fillStyle = '#1e2229';
    ctx.fillRect(0, 0, 512, 512);
    const step = 64;
    for (let x = 0; x < 512; x += step) {
      for (let y = 0; y < 512; y += step) {
        ctx.fillStyle = (x + y) % 128 === 0 ? '#262c35' : '#1c2026';
        ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
        // Basalt pores
        for (let p = 0; p < 12; p++) {
          ctx.fillStyle = 'rgba(8, 10, 14, 0.4)';
          ctx.fillRect(x + 4 + Math.random() * (step - 8), y + 4 + Math.random() * (step - 8), 2, 2);
        }
      }
    }
  } else {
    // Warm Tuscan Greige Travertine
    ctx.fillStyle = '#3c3630';
    ctx.fillRect(0, 0, 512, 512);
    const step = 64;
    for (let x = 0; x < 512; x += step) {
      for (let y = 0; y < 512; y += step) {
        ctx.fillStyle = (x + y) % 128 === 0 ? '#463f38' : '#352f29';
        ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
        for (let p = 0; p < 8; p++) {
          ctx.fillStyle = 'rgba(20, 16, 12, 0.25)';
          ctx.fillRect(x + 4 + Math.random() * (step - 8), y + 4 + Math.random() * (step - 8), 2, 2);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 6);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createLushLawnTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(c);

  // Moody deep emerald grass with subtle micro variations
  ctx.fillStyle = '#183015';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3500; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(38, 76, 32, 0.45)' : 'rgba(12, 24, 10, 0.45)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 7);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPoolTilesTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(c);

  ctx.fillStyle = '#062638';
  ctx.fillRect(0, 0, 256, 256);
  const size = 16;
  for (let x = 0; x < 256; x += size) {
    for (let y = 0; y < 256; y += size) {
      const g = (x + y) % 32 === 0 ? '#0b3d59' : '#08324a';
      ctx.fillStyle = g;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}
