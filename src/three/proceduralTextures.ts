import * as THREE from 'three';

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createEarthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean base gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#cfe8ff');
  oceanGrad.addColorStop(0.12, '#0a2d5e');
  oceanGrad.addColorStop(0.5, '#0b3d7a');
  oceanGrad.addColorStop(0.88, '#0a2d5e');
  oceanGrad.addColorStop(1, '#dceeff');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Deterministic procedural continents
  const drawContinent = (cx: number, cy: number, rx: number, ry: number, seed: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    const pts = 26;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const noise =
        0.72 +
        0.22 * Math.sin(a * 3 + seed) +
        0.14 * Math.cos(a * 5 - seed * 1.7) +
        0.08 * Math.sin(a * 9 + seed * 2.1);
      const x = cx + Math.cos(a) * rx * noise;
      const y = cy + Math.sin(a) * ry * noise;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };

  // Americas
  drawContinent(255, 165, 85, 72, 1.2, '#2d6a4f');
  drawContinent(290, 225, 45, 34, 2.4, '#52796f');
  drawContinent(330, 325, 58, 92, 3.1, '#2d6a4f');
  // Eurasia & Africa
  drawContinent(560, 155, 110, 58, 4.7, '#3a6b4c');
  drawContinent(690, 165, 145, 74, 5.5, '#4c6d45');
  drawContinent(555, 285, 76, 86, 6.2, '#8b734b');
  drawContinent(550, 255, 58, 35, 7.1, '#b69b66'); // Sahara
  // Australia
  drawContinent(810, 345, 58, 42, 8.3, '#9d6b43');
  // Greenland
  drawContinent(395, 76, 48, 28, 9.2, '#d8e9f5');

  // Atmospheric cloud wisps
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let i = 0; i < 65; i++) {
    const x = ((i * 157) % 1024);
    const y = 45 + ((i * 89) % 420);
    const w = 55 + (i % 5) * 28;
    const h = 10 + (i % 4) * 6;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, (i % 6) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar ice caps
  ctx.fillStyle = 'rgba(240, 248, 255, 0.9)';
  ctx.fillRect(0, 0, 1024, 28);
  ctx.fillRect(0, 482, 1024, 30);

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createMoonTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8b8f94';
  ctx.fillRect(0, 0, 512, 256);

  // Lunar maria (dark basalt plains)
  for (let i = 0; i < 14; i++) {
    const x = (i * 79 + 40) % 512;
    const y = 40 + ((i * 53) % 176);
    const r = 24 + (i % 4) * 14;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(65, 68, 74, 0.65)');
    g.addColorStop(1, 'rgba(65, 68, 74, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters
  for (let i = 0; i < 90; i++) {
    const x = (i * 113 + 17) % 512;
    const y = 12 + ((i * 67) % 232);
    const r = 2 + (i % 6) * 2.2;
    ctx.strokeStyle = 'rgba(215, 220, 226, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(55, 58, 64, 0.35)';
    ctx.beginPath();
    ctx.arc(x + 0.6, y + 0.6, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createMarsTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#e9d8cc');
  grad.addColorStop(0.1, '#a94b2b');
  grad.addColorStop(0.5, '#c45b33');
  grad.addColorStop(0.9, '#943c20');
  grad.addColorStop(1, '#e9d8cc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Basalt dark regions & dust plains
  for (let i = 0; i < 22; i++) {
    const x = (i * 97 + 20) % 512;
    const y = 30 + ((i * 41) % 196);
    const r = 18 + (i % 5) * 10;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(90, 36, 20, 0.36)' : 'rgba(222, 128, 76, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.4, r * 0.8, (i % 4) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar ice caps
  ctx.fillStyle = 'rgba(248, 245, 242, 0.85)';
  ctx.fillRect(0, 0, 512, 12);
  ctx.fillRect(0, 244, 512, 12);

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createJupiterTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const bands = [
    '#9a846b', '#d9c5a7', '#b57b52', '#e4d5be', '#c68a5c',
    '#8c5b3f', '#dfd0ba', '#b8764c', '#d5c1a4', '#9c785c',
  ];
  const bh = 256 / bands.length;
  bands.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, i * bh, 512, bh + 1);
  });

  // Great Red Spot
  ctx.fillStyle = '#b94b2d';
  ctx.beginPath();
  ctx.ellipse(320, 165, 28, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e7cbb0';
  ctx.lineWidth = 3;
  ctx.stroke();

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createHqFloorGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18202c';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#253144';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.16)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 508, 508);

  return finalizeColorTexture(canvas, maxAnisotropy, 10, 10);
}

export function createLaunchpadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#333b48';
  ctx.fillRect(0, 0, 512, 512);

  // Blast concrete scorch ring
  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 175);
  grad.addColorStop(0, '#12151a');
  grad.addColorStop(0.5, '#252a33');
  grad.addColorStop(1, 'rgba(51, 59, 72, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Hazard yellow ring
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 8;
  ctx.setLineDash([20, 14]);
  ctx.beginPath();
  ctx.arc(256, 256, 155, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshair pad markers
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(241, 245, 249, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, 256);
  ctx.lineTo(130, 256);
  ctx.moveTo(382, 256);
  ctx.lineTo(472, 256);
  ctx.moveTo(256, 40);
  ctx.lineTo(256, 130);
  ctx.moveTo(256, 382);
  ctx.lineTo(256, 472);
  ctx.stroke();

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createMissionControlScreenTexture(
  kind: 'earth_track' | 'telemetry_matrix' | 'solar_plan',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#060c18';
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle grid
  ctx.strokeStyle = '#11223d';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 1004, 492);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px monospace';

  if (kind === 'earth_track') {
    ctx.fillText('FLIGHT DYNAMICS // WORLD ORBITAL GROUND TRACK', 36, 52);
    // Simplified world outline rectangles & sine ground track
    ctx.fillStyle = '#123254';
    ctx.fillRect(140, 140, 160, 110);
    ctx.fillRect(260, 270, 90, 130);
    ctx.fillRect(490, 120, 290, 125);
    ctx.fillRect(500, 245, 115, 145);
    ctx.fillRect(760, 310, 105, 85);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 30; x <= 994; x += 8) {
      const y = 265 + Math.sin((x / 1024) * Math.PI * 4) * 125;
      if (x === 30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(610, 265 + Math.sin((610 / 1024) * Math.PI * 4) * 125, 11, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'telemetry_matrix') {
    ctx.fillText('PROPULSION & VEHICLE TELEMETRY MATRIX', 36, 52);
    const bars = [
      { label: 'LOX TANK PRESS', val: 0.92, col: '#06b6d4' },
      { label: 'FUEL MANIFOLD', val: 0.88, col: '#2563eb' },
      { label: 'STAGE 1 TWR', val: 0.78, col: '#f59e0b' },
      { label: 'AVIONICS BUS', val: 0.96, col: '#10b981' },
      { label: 'UPLINK SNR', val: 0.84, col: '#38bdf8' },
    ];
    bars.forEach((b, i) => {
      const y = 115 + i * 74;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '20px monospace';
      ctx.fillText(b.label, 44, y);
      ctx.fillStyle = '#111d30';
      ctx.fillRect(300, y - 22, 660, 32);
      ctx.fillStyle = b.col;
      ctx.fillRect(300, y - 22, 660 * b.val, 32);
    });
  } else {
    ctx.fillText('DEEP SPACE NETWORK // TRAJECTORY CORRIDOR', 36, 52);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    [90, 150, 220, 310].forEach((r) => {
      ctx.beginPath();
      ctx.arc(512, 275, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    // Sun
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(512, 275, 22, 0, Math.PI * 2);
    ctx.fill();
    // Earth & Mars
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(662, 275, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(512, 55, 12, 0, Math.PI * 2);
    ctx.fill();
    // Hohmann arc
    ctx.strokeStyle = '#22d3ee';
    ctx.setLineDash([12, 8]);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(512, 165, 150, 110, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
