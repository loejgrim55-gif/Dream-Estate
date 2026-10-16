import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AppState, RoomZone } from '../types';
import { ESTATE_ROOMS } from '../data/estateRooms';
import { createFloorCanvasTexture, createLushLawnTexture, createPoolTilesTexture } from '../utils/textures';

interface Viewport3DProps {
  appState: AppState;
  onSelectRoom: (room: RoomZone) => void;
}

// Reusable math vectors outside the animation loop (Zero GC)
const _cameraTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _fpsFwd = new THREE.Vector3();
const _fpsRight = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

// High-fidelity seamless furniture texture paths generated
const TEXTURE_PATHS = {
  leather: '/src/assets/images/furniture_leather_1792149608555.jpg',
  boucle: '/src/assets/images/furniture_boucle_1792149609491.jpg',
  velvet: '/src/assets/images/furniture_velvet_1792149610250.jpg',
  walnut: '/src/assets/images/furniture_walnut_1792149622287.jpg'
};

/**
 * Creates a rounded rectangular 2D shape for beveled extrusion (eradicating cubical edges)
 */
function createRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const radius = Math.min(r, w / 2 - 0.01, d / 2 - 0.01);
  const hw = w / 2 - radius;
  const hd = d / 2 - radius;
  shape.moveTo(-hw, -d / 2);
  shape.lineTo(hw, -d / 2);
  shape.absarc(hw, -hd, radius, -Math.PI / 2, 0, false);
  shape.lineTo(w / 2, hd);
  shape.absarc(hw, hd, radius, 0, Math.PI / 2, false);
  shape.lineTo(-hw, d / 2);
  shape.absarc(-hw, hd, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w / 2, -hd);
  shape.absarc(-hw, -hd, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/**
 * Creates an organic rounded beveled 3D mesh
 */
function createBeveledMesh(
  w: number,
  h: number,
  d: number,
  r: number,
  material: THREE.Material,
  bevel = 0.04
): THREE.Mesh {
  const shape = createRoundedRectShape(w, d, r);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.04, h - bevel * 2),
    bevelEnabled: bevel > 0.005,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel
  });
  geo.rotateX(Math.PI / 2);
  geo.center();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a soft radial contact shadow plane to ground 3D objects
 */
function createContactShadow(w: number, d: number, opacity = 0.42): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const rad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    rad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
    rad.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 0.5})`);
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  plane.rotation.x = -Math.PI / 2;
  return plane;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({ appState, onSelectRoom }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(appState);
  stateRef.current = appState;

  // Camera navigation state
  const navRef = useRef({
    target: new THREE.Vector3(0, 0, -1),
    smoothTarget: new THREE.Vector3(0, 0, -1),
    radius: 64,
    smoothRadius: 64,
    theta: 0.0,
    smoothTheta: 0.0,
    phi: 0.72,
    smoothPhi: 0.72,
    dragging: false,
    lastX: 0,
    lastY: 0,
    fpsPos: new THREE.Vector3(-7.5, 1.75, 9.5),
    fpsYaw: 0,
    fpsPitch: 0,
    keys: {} as Record<string, boolean>
  });

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    mainFloorMesh: THREE.Mesh | null;
    poolWaterMesh: THREE.Mesh | null;
    fireFlameMesh: THREE.Mesh | null;
    fireEmbersMesh: THREE.Mesh | null;
    firePoint1: THREE.PointLight;
    firePoint2: THREE.PointLight;
    roofGroup: THREE.Group;
    starsParticles: THREE.Points;
    weatherParticles: THREE.Points;
    interiorLights: THREE.PointLight[];
    sconceLights: THREE.PointLight[];
    poolLights: THREE.PointLight[];
    ledCoveMeshes: THREE.Mesh[];
    foliageMeshes: THREE.Mesh[];
    wallMeshes: THREE.Mesh[];
    wallCapMeshes: THREE.Mesh[];
    roomInteractiveMeshes: { mesh: THREE.Mesh; roomId: string }[];
  } | null>(null);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080d);
    scene.fog = new THREE.FogExp2(0x06080d, 0.0048);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 380);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    mountRef.current.replaceChildren(renderer.domElement);

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Load High-Fidelity 4K Seamless Furniture Textures
    const texLoader = new THREE.TextureLoader();

    const loadSeamlessTex = (url: string, repeatX = 2, repeatY = 2) => {
      const tex = texLoader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      tex.anisotropy = maxAnisotropy;
      return tex;
    };

    const leatherTex = loadSeamlessTex(TEXTURE_PATHS.leather, 3, 3);
    const boucleTex = loadSeamlessTex(TEXTURE_PATHS.boucle, 4, 4);
    const velvetTex = loadSeamlessTex(TEXTURE_PATHS.velvet, 3, 3);
    const walnutTex = loadSeamlessTex(TEXTURE_PATHS.walnut, 2, 4);

    // Scene Groups
    const estateRoot = new THREE.Group();
    scene.add(estateRoot);

    const roofGroup = new THREE.Group();
    roofGroup.visible = false;
    scene.add(roofGroup);

    const interiorLights: THREE.PointLight[] = [];
    const sconceLights: THREE.PointLight[] = [];
    const poolLights: THREE.PointLight[] = [];
    const ledCoveMeshes: THREE.Mesh[] = [];
    const foliageMeshes: THREE.Mesh[] = [];
    const wallMeshes: THREE.Mesh[] = [];
    const wallCapMeshes: THREE.Mesh[] = [];
    const roomInteractiveMeshes: { mesh: THREE.Mesh; roomId: string }[] = [];

    // Refined PBR Luxury Materials with Clearcoat & Transmission
    const M = {
      wallDark: new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.65, metalness: 0.08 }),
      wallCapBronze: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.28, metalness: 0.85 }),
      woodEspresso: new THREE.MeshPhysicalMaterial({
        map: walnutTex,
        roughness: 0.38,
        metalness: 0.06,
        clearcoat: 0.35,
        clearcoatRoughness: 0.15
      }),
      woodTeakDark: new THREE.MeshStandardMaterial({
        map: walnutTex,
        color: 0x4a3220,
        roughness: 0.48
      }),
      fabricLeather: new THREE.MeshPhysicalMaterial({
        map: leatherTex,
        roughness: 0.42,
        metalness: 0.15,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3
      }),
      fabricBoucle: new THREE.MeshStandardMaterial({
        map: boucleTex,
        roughness: 0.92,
        metalness: 0.02
      }),
      fabricVelvet: new THREE.MeshStandardMaterial({
        map: velvetTex,
        roughness: 0.72,
        metalness: 0.22
      }),
      porcelainWhite: new THREE.MeshPhysicalMaterial({
        color: 0xf4f4f5,
        roughness: 0.12,
        metalness: 0.06,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08
      }),
      marbleBlackHoned: new THREE.MeshPhysicalMaterial({
        color: 0x101318,
        roughness: 0.16,
        metalness: 0.2,
        clearcoat: 0.85,
        clearcoatRoughness: 0.1
      }),
      bronzeBrushed: new THREE.MeshStandardMaterial({
        color: 0xb58857,
        roughness: 0.22,
        metalness: 0.92
      }),
      glassSmoked: new THREE.MeshPhysicalMaterial({
        color: 0x222a36,
        transparent: true,
        opacity: 0.48,
        roughness: 0.04,
        metalness: 0.2,
        transmission: 0.82,
        thickness: 0.4,
        ior: 1.52,
        attenuationColor: new THREE.Color(0x334155),
        attenuationDistance: 1.5
      }),
      rugDarkCharcoal: new THREE.MeshStandardMaterial({
        map: boucleTex,
        color: 0x16181e,
        roughness: 0.96
      }),
      ledGlow: new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf59e0b,
        emissiveIntensity: 2.0,
        roughness: 0.1
      })
    };

    // Fine Wall Construction with Baseboard Reveal
    const buildWall = (parent: THREE.Group, w: number, h: number, d: number, x: number, z: number, rotY = 0) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;

      // Baseboard reveal gap
      const baseboard = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d + 0.02), M.bronzeBrushed);
      baseboard.position.y = 0.04;
      g.add(baseboard);

      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.08, d), M.wallDark);
      wall.position.y = (h + 0.08) / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
      g.add(wall);
      wallMeshes.push(wall);

      // Chamfered bronze top cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.14, d + 0.06), M.wallCapBronze);
      cap.position.y = h + 0.07;
      g.add(cap);
      wallCapMeshes.push(cap);

      parent.add(g);
      return g;
    };

    const buildCurvedWall = (
      parent: THREE.Group,
      radius: number,
      height: number,
      thickness: number,
      startAngle: number,
      sweepAngle: number,
      x: number,
      z: number,
      isGlass = false
    ) => {
      const segs = 32;
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      for (let i = 0; i < segs; i++) {
        const a1 = startAngle + (i / segs) * sweepAngle;
        const a2 = startAngle + ((i + 1) / segs) * sweepAngle;
        const mid = (a1 + a2) / 2;
        const len = radius * (sweepAngle / segs) * 1.05;

        const part = new THREE.Mesh(
          new THREE.BoxGeometry(len, height, thickness),
          isGlass ? M.glassSmoked : M.wallDark
        );
        part.position.set(Math.cos(mid) * radius, height / 2, Math.sin(mid) * radius);
        part.rotation.y = -mid + Math.PI / 2;
        part.castShadow = !isGlass;
        g.add(part);
        if (!isGlass) wallMeshes.push(part);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.14, thickness + 0.06), M.wallCapBronze);
        cap.position.set(Math.cos(mid) * radius, height + 0.07, Math.sin(mid) * radius);
        cap.rotation.y = -mid + Math.PI / 2;
        g.add(cap);
        wallCapMeshes.push(cap);
      }
      parent.add(g);
    };

    const addLedStrip = (parent: THREE.Group, w: number, d: number, x: number, y: number, z: number, rotY = 0) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), M.ledGlow);
      strip.position.set(x, y, z);
      strip.rotation.y = rotY;
      parent.add(strip);
      ledCoveMeshes.push(strip);
      return strip;
    };

    const buildSlattedWoodWall = (parent: THREE.Group, w: number, h: number, x: number, z: number, rotY = 0) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      const count = Math.floor(w / 0.16);
      for (let i = 0; i < count; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.06), M.woodEspresso);
        slat.position.set(-w / 2 + i * 0.16, h / 2, 0);
        slat.castShadow = true;
        g.add(slat);
      }
      parent.add(g);
    };

    /**
     * High-end Bed with rounded contours, capsule pillows, and contact shadow
     */
    const buildIntricateBed = (parent: THREE.Group, x: number, z: number, rotY = 0, blanketColor = 0xb45309) => {
      const bed = new THREE.Group();
      bed.position.set(x, 0.32, z);
      bed.rotation.y = rotY;

      // Contact Shadow
      const shadow = createContactShadow(4.2, 3.8, 0.45);
      shadow.position.set(0, 0.01, 0.15);
      bed.add(shadow);

      // Beveled woven rug
      const rug = createBeveledMesh(3.8, 0.03, 3.5, 0.2, M.rugDarkCharcoal, 0.015);
      rug.position.set(0, 0.015, 0.15);
      bed.add(rug);

      // Floating rounded walnut platform base
      const base = createBeveledMesh(2.5, 0.28, 2.7, 0.15, M.woodEspresso, 0.03);
      base.position.y = 0.14;
      bed.add(base);

      addLedStrip(bed, 2.3, 2.5, 0, 0.03, 0);

      const mattress = createBeveledMesh(2.2, 0.36, 2.4, 0.12, M.fabricBoucle, 0.04);
      mattress.position.y = 0.44;
      bed.add(mattress);

      const bolster = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.18, 24), M.fabricBoucle);
      bolster.rotation.z = Math.PI / 2;
      bolster.position.set(0, 0.46, 1.18);
      bolster.castShadow = true;
      bed.add(bolster);

      const headboard = createBeveledMesh(2.9, 1.45, 0.22, 0.16, M.fabricLeather, 0.04);
      headboard.position.set(0, 0.72, -1.24);
      bed.add(headboard);

      buildSlattedWoodWall(bed, 3.4, 2.6, 0, -1.35);

      const throwMat = new THREE.MeshStandardMaterial({ color: blanketColor, roughness: 0.72 });
      const blanket = createBeveledMesh(2.22, 0.14, 1.05, 0.08, throwMat, 0.02);
      blanket.position.set(0, 0.6, 0.65);
      bed.add(blanket);

      [-0.55, 0.55].forEach((px) => {
        const pillow = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.48, 8, 16), M.fabricBoucle);
        pillow.rotation.z = Math.PI / 2;
        pillow.position.set(px, 0.7, -0.84);
        pillow.castShadow = true;
        bed.add(pillow);

        const accentPillow = createBeveledMesh(0.52, 0.2, 0.34, 0.06, M.fabricVelvet, 0.03);
        accentPillow.position.set(px, 0.72, -0.48);
        accentPillow.rotation.x = 0.3;
        bed.add(accentPillow);
      });

      [-1.75, 1.75].forEach((nx) => {
        const stand = createBeveledMesh(0.72, 0.38, 0.58, 0.1, M.woodEspresso, 0.03);
        stand.position.set(nx, 0.28, -0.95);
        bed.add(stand);

        const lampPoints = [
          new THREE.Vector2(0.14, 0),
          new THREE.Vector2(0.13, 0.08),
          new THREE.Vector2(0.06, 0.22),
          new THREE.Vector2(0.12, 0.38),
          new THREE.Vector2(0.04, 0.42)
        ];
        const lampGeo = new THREE.LatheGeometry(lampPoints, 20);
        const lamp = new THREE.Mesh(lampGeo, M.bronzeBrushed);
        lamp.position.set(nx, 0.47, -0.95);
        lamp.castShadow = true;
        bed.add(lamp);

        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.18, 0.22, 20, 1, true),
          new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
        );
        shade.position.set(nx, 0.72, -0.95);
        bed.add(shade);

        const lampPt = new THREE.PointLight(0xf59e0b, 0.5, 4);
        lampPt.position.set(nx, 0.75, -0.95);
        bed.add(lampPt);
        interiorLights.push(lampPt);
      });

      parent.add(bed);
    };

    /**
     * Sleek aerodynamic sports car with high-gloss clearcoat & contact shadow
     */
    const buildSculptedCar = (parent: THREE.Group, x: number, z: number, bodyHex: number) => {
      const car = new THREE.Group();
      car.position.set(x, 0.32, z);

      // Contact shadow beneath car
      const carShadow = createContactShadow(2.8, 5.2, 0.55);
      carShadow.position.y = 0.02;
      car.add(carShadow);

      // Deep automotive clearcoat paint
      const paintMat = new THREE.MeshPhysicalMaterial({
        color: bodyHex,
        roughness: 0.08,
        metalness: 0.94,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04
      });

      const chassis = createBeveledMesh(2.1, 0.46, 4.8, 0.35, paintMat, 0.08);
      chassis.position.y = 0.38;
      car.add(chassis);

      const cockpitShape = new THREE.Shape();
      cockpitShape.moveTo(-0.8, -1.2);
      cockpitShape.lineTo(0.8, -1.2);
      cockpitShape.quadraticCurveTo(0.9, 0, 0.7, 1.2);
      cockpitShape.lineTo(-0.7, 1.2);
      cockpitShape.quadraticCurveTo(-0.9, 0, -0.8, -1.2);

      const cockpitGeo = new THREE.ExtrudeGeometry(cockpitShape, {
        depth: 0.42,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.08,
        bevelThickness: 0.08
      });
      cockpitGeo.rotateX(Math.PI / 2);
      cockpitGeo.center();
      const cockpit = new THREE.Mesh(
        cockpitGeo,
        new THREE.MeshPhysicalMaterial({
          color: 0x05070a,
          roughness: 0.03,
          metalness: 0.98,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02
        })
      );
      cockpit.position.set(0, 0.78, -0.15);
      cockpit.castShadow = true;
      car.add(cockpit);

      // 4 Sculpted Wheels with bronze alloy rims & rubber tires
      [[-1.05, -1.45], [1.05, -1.45], [-1.05, 1.45], [1.05, 1.45]].forEach(([wx, wz]) => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(wx, 0.35, wz);
        wheelGroup.rotation.z = Math.PI / 2;

        const tire = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.09, 14, 24),
          new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.85 })
        );
        wheelGroup.add(tire);

        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.16, 20),
          M.bronzeBrushed
        );
        wheelGroup.add(rim);

        car.add(wheelGroup);
      });

      // Ribbon LED headlights and taillights
      [-0.68, 0.68].forEach((lx) => {
        const hl = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.06, 0.28, 6, 12),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 2.2 })
        );
        hl.rotation.y = Math.PI / 2;
        hl.position.set(lx, 0.46, 2.38);
        car.add(hl);

        const tl = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.05, 0.34, 6, 12),
          new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 2.0 })
        );
        tl.rotation.y = Math.PI / 2;
        tl.position.set(lx, 0.48, -2.38);
        car.add(tl);
      });

      parent.add(car);
    };

    /**
     * Organic Layered Italian Cypress Trees
     */
    const buildDarkCypress = (parent: THREE.Group, x: number, z: number, scale = 1) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      tree.scale.setScalar(scale);

      // Contact shadow beneath tree
      const shadow = createContactShadow(2.2, 2.2, 0.35);
      shadow.position.y = 0.02;
      tree.add(shadow);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.22, 1.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.9 })
      );
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x142c16, roughness: 0.78 });

      const tiers = [
        { r: 0.88, h: 2.2, y: 1.8 },
        { r: 0.74, h: 2.2, y: 2.8 },
        { r: 0.58, h: 2.0, y: 3.8 },
        { r: 0.36, h: 1.6, y: 4.8 }
      ];

      tiers.forEach((t, idx) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 16), foliageMat);
        cone.position.y = t.y;
        cone.rotation.y = idx * 0.45;
        cone.castShadow = true;
        tree.add(cone);
        foliageMeshes.push(cone);
      });

      parent.add(tree);
    };

    const addDarkBronzeSconce = (parent: THREE.Group, x: number, y: number, z: number) => {
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.38, 12), M.bronzeBrushed);
      bracket.position.set(x, y, z);
      parent.add(bracket);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xf59e0b, emissiveIntensity: 2.0 })
      );
      orb.position.set(x, y, z);
      parent.add(orb);

      const pt = new THREE.PointLight(0xf59e0b, 0.9, 10);
      pt.position.set(x, y, z);
      parent.add(pt);
      sconceLights.push(pt);
    };

    const registerInteractiveZone = (mesh: THREE.Mesh, roomId: string) => {
      roomInteractiveMeshes.push({ mesh, roomId });
    };

    // 1. Lawns, Basalt Pathways & Perimeter
    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(108, 72),
      new THREE.MeshStandardMaterial({ map: createLushLawnTexture(maxAnisotropy), roughness: 0.9 })
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.receiveShadow = true;
    estateRoot.add(lawn);

    const driveMat = new THREE.MeshStandardMaterial({ color: 0x181d24, roughness: 0.65 });
    const westCourt = new THREE.Mesh(new THREE.BoxGeometry(28, 0.08, 13.5), driveMat);
    westCourt.position.set(-25, 0.04, 19.5);
    westCourt.receiveShadow = true;
    estateRoot.add(westCourt);

    const southDrive = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 6.5), driveMat);
    southDrive.position.set(4, 0.04, 24.5);
    southDrive.receiveShadow = true;
    estateRoot.add(southDrive);

    // Grand Foyer Stepped Basalt Stone Entrance with Rounded Step Profiles
    const stoneStepMat = new THREE.MeshStandardMaterial({ color: 0x242831, roughness: 0.5 });
    for (let s = 0; s < 6; s++) {
      const step = createBeveledMesh(5.6, 0.14, 1.8, 0.12, stoneStepMat, 0.03);
      step.position.set(-8.5, 0.07 + (5 - s) * 0.04, 11.2 + s * 1.9);
      estateRoot.add(step);
      addLedStrip(estateRoot, 5.2, 0.04, -8.5, 0.12 + (5 - s) * 0.04, 10.3 + s * 1.9);
    }

    // East Stepping Stones & Planter
    for (let p = 0; p < 12; p++) {
      const stone = createBeveledMesh(2.2, 0.08, 0.8, 0.15, stoneStepMat, 0.02);
      stone.position.set(11.5, 0.05, 8.5 + p * 1.2);
      estateRoot.add(stone);
    }
    const squareGarden = createBeveledMesh(5.6, 0.45, 5.6, 0.25, M.wallCapBronze, 0.04);
    squareGarden.position.set(16.5, 0.22, 17.5);
    estateRoot.add(squareGarden);
    buildDarkCypress(estateRoot, 16.5, 17.5, 1.2);

    // Outer Perimeter Walls & Dark Bronze Sconces
    buildWall(estateRoot, 96, 2.4, 0.45, 0, -25.5);
    buildWall(estateRoot, 0.45, 2.4, 52, -47.5, 0.5);
    buildWall(estateRoot, 0.45, 2.4, 52, 47.5, 0.5);

    for (let x = -42; x <= 42; x += 12) {
      addDarkBronzeSconce(estateRoot, x, 1.9, -25.1);
      addDarkBronzeSconce(estateRoot, x, 1.5, 26.2);
    }
    for (let z = -20; z <= 22; z += 10) {
      addDarkBronzeSconce(estateRoot, -47.0, 1.9, z);
      addDarkBronzeSconce(estateRoot, 47.0, 1.9, z);
    }

    // Front Gate with Fluted Bronze Colonnade
    [-11.8, -5.2].forEach((gx) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 2.7, 24), M.wallDark);
      pillar.position.set(gx, 1.35, 23.5);
      estateRoot.add(pillar);
      wallMeshes.push(pillar);
      addDarkBronzeSconce(estateRoot, gx, 2.8, 23.5);
    });
    const ironGate = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.0, 0.14), M.bronzeBrushed);
    ironGate.position.set(-8.5, 1.0, 23.5);
    estateRoot.add(ironGate);

    // 2. Foundation & Dynamic Flooring
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(62, 0.32, 20),
      new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.7 })
    );
    foundation.position.set(4, 0.16, -1);
    foundation.receiveShadow = true;
    estateRoot.add(foundation);

    const mainFloorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(61.6, 19.6),
      new THREE.MeshStandardMaterial({
        map: createFloorCanvasTexture(appState.floorFinish, maxAnisotropy),
        roughness: 0.18,
        metalness: 0.15
      })
    );
    mainFloorMesh.rotation.x = -Math.PI / 2;
    mainFloorMesh.position.set(4, 0.33, -1);
    mainFloorMesh.receiveShadow = true;
    estateRoot.add(mainFloorMesh);

    addLedStrip(estateRoot, 60.5, 0.08, 4, 0.35, -10.5);
    addLedStrip(estateRoot, 60.5, 0.08, 4, 0.35, 8.5);

    // 3. West Master Wing (Angled & Curved)
    const masterWing = new THREE.Group();
    masterWing.position.set(-31, 0, -8.5);
    masterWing.rotation.y = 0.42;

    const mSlab = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.34, 17.2), M.wallDark);
    mSlab.position.y = 0.17;
    mSlab.receiveShadow = true;
    masterWing.add(mSlab);
    wallMeshes.push(mSlab);
    registerInteractiveZone(mSlab, 'master');

    buildWall(masterWing, 15.2, 3.1, 0.32, 0, -8.2);
    buildWall(masterWing, 15.2, 3.1, 0.32, 0, 8.2);
    buildWall(masterWing, 0.32, 3.1, 16.4, 7.4, 0);
    buildWall(masterWing, 0.24, 3.1, 9.0, 1.2, -3.5);
    buildWall(masterWing, 8.0, 3.1, 0.24, 3.4, 1.0);
    buildCurvedWall(masterWing, 8.2, 3.1, 0.32, Math.PI * 0.55, Math.PI * 0.9, -3.2, 0, false);

    buildIntricateBed(masterWing, -2.2, -3.2, 0, 0xd97706);

    // Master Sitting Chaise Lounge with soft rounded contour in 4K Italian Leather
    const mSofa = createBeveledMesh(2.6, 0.68, 1.05, 0.25, M.fabricLeather, 0.05);
    mSofa.position.set(-3.2, 0.68, 3.8);
    masterWing.add(mSofa);

    const mSofaBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 2.0, 8, 16), M.fabricLeather);
    mSofaBack.rotation.z = Math.PI / 2;
    mSofaBack.position.set(-3.2, 1.08, 3.4);
    mSofaBack.castShadow = true;
    masterWing.add(mSofaBack);

    // Dark Smoked Glass Walk-In Wardrobes & Island with Rounded Corners
    const closetL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 5.6), M.glassSmoked);
    closetL.position.set(2.0, 1.6, -4.5);
    masterWing.add(closetL);
    const closetR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 5.6), M.glassSmoked);
    closetR.position.set(6.6, 1.6, -4.5);
    masterWing.add(closetR);

    const closetIsland = createBeveledMesh(1.4, 0.9, 2.6, 0.15, M.marbleBlackHoned, 0.04);
    closetIsland.position.set(4.3, 0.78, -4.5);
    masterWing.add(closetIsland);
    addLedStrip(masterWing, 1.3, 2.5, 4.3, 0.36, -4.5);

    // Sculpted Freestanding Oval Soaking Tub
    const tubPoints = [
      new THREE.Vector2(0.5, 0),
      new THREE.Vector2(0.75, 0.08),
      new THREE.Vector2(0.88, 0.35),
      new THREE.Vector2(0.92, 0.65),
      new THREE.Vector2(0.85, 0.66),
      new THREE.Vector2(0.78, 0.35),
      new THREE.Vector2(0.45, 0.06)
    ];
    const tubGeo = new THREE.LatheGeometry(tubPoints, 32);
    tubGeo.scale(1.45, 1, 0.9);
    const ovalTub = new THREE.Mesh(tubGeo, M.marbleBlackHoned);
    ovalTub.position.set(2.8, 0.36, 5.2);
    ovalTub.castShadow = true;
    masterWing.add(ovalTub);

    const mVanity = createBeveledMesh(0.65, 0.86, 3.4, 0.12, M.woodEspresso, 0.03);
    mVanity.position.set(6.7, 0.76, 4.2);
    masterWing.add(mVanity);

    // Twin Sculpted Pebble Backlit Mirrors
    [-0.75, 0.75].forEach((my) => {
      const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32), M.bronzeBrushed);
      mirror.rotation.z = Math.PI / 2;
      mirror.position.set(6.85, 1.8, 4.2 + my);
      masterWing.add(mirror);

      const mirrorHalo = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.03, 12, 32), M.ledGlow);
      mirrorHalo.rotation.y = Math.PI / 2;
      mirrorHalo.position.set(6.84, 1.8, 4.2 + my);
      masterWing.add(mirrorHalo);
      ledCoveMeshes.push(mirrorHalo);
    });

    const mLight = new THREE.PointLight(0xf59e0b, 1.3, 18);
    mLight.position.set(0, 3.2, 0);
    masterWing.add(mLight);
    interiorLights.push(mLight);
    estateRoot.add(masterWing);

    // 4. Dolby Atmos Home Cinema
    const cinema = new THREE.Group();
    cinema.position.set(-18.5, 0.33, -5.5);

    const cCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.06, 9.2),
      new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.95 })
    );
    cCarpet.position.y = 0.03;
    cinema.add(cCarpet);
    registerInteractiveZone(cCarpet, 'cinema');

    buildWall(cinema, 0.28, 3.1, 9.2, -3.6, 0);
    buildWall(cinema, 0.28, 3.1, 9.2, 3.6, 0);
    buildWall(cinema, 7.2, 3.1, 0.28, 0, -4.6);

    buildSlattedWoodWall(cinema, 8.8, 2.9, -3.45, 0, Math.PI / 2);
    buildSlattedWoodWall(cinema, 8.8, 2.9, 3.45, 0, -Math.PI / 2);

    const movieScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 2.2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    movieScreen.position.set(0, 1.75, -4.42);
    cinema.add(movieScreen);

    // Screen ambient glow
    const screenGlow = new THREE.PointLight(0x0284c7, 1.5, 9);
    screenGlow.position.set(0, 1.75, -3.8);
    cinema.add(screenGlow);
    interiorLights.push(screenGlow);

    addLedStrip(cinema, 5.6, 0.04, 0, 2.9, -4.4);
    addLedStrip(cinema, 5.6, 0.04, 0, 0.6, -4.4);

    // Tiered Cinema Recliners with Ergonomic Rounded Velvet Cushions
    [-1.5, 0.6, 2.7].forEach((rz, rowIdx) => {
      const riser = createBeveledMesh(6.6, 0.15 * (rowIdx + 1), 1.85, 0.15, M.wallCapBronze, 0.02);
      riser.position.set(0, 0.075 * (rowIdx + 1), rz);
      cinema.add(riser);

      addLedStrip(cinema, 6.4, 0.04, 0, 0.15 * (rowIdx + 1), rz - 0.9);

      [-1.8, -0.6, 0.6, 1.8].forEach((rx) => {
        const seat = new THREE.Group();
        seat.position.set(rx, 0.15 * (rowIdx + 1), rz);

        const seatCushion = createBeveledMesh(0.85, 0.32, 0.82, 0.12, M.fabricVelvet, 0.04);
        seatCushion.position.y = 0.3;
        seat.add(seatCushion);

        const seatBack = createBeveledMesh(0.85, 0.72, 0.22, 0.12, M.fabricVelvet, 0.04);
        seatBack.position.set(0, 0.68, -0.32);
        seat.add(seatBack);

        const headrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.55, 6, 14), M.fabricVelvet);
        headrest.rotation.z = Math.PI / 2;
        headrest.position.set(0, 1.08, -0.32);
        seat.add(headrest);

        cinema.add(seat);
      });
    });

    const cLight = new THREE.PointLight(0xd97706, 0.75, 12);
    cLight.position.set(0, 2.8, 0);
    cinema.add(cLight);
    interiorLights.push(cLight);
    estateRoot.add(cinema);

    // 5. Central Lounge, Dining, Kitchen & Cellar
    const centralCore = new THREE.Group();
    centralCore.position.set(-4, 0.33, -5.5);

    buildWall(centralCore, 22, 3.1, 0.16, 0, -4.6);

    for (let gx = -10; gx <= 10; gx += 4) {
      const glassSlider = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.9, 0.1), M.glassSmoked);
      glassSlider.position.set(gx, 1.5, -4.5);
      centralCore.add(glassSlider);

      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 0.16), M.bronzeBrushed);
      mullion.position.set(gx + 1.9, 1.5, -4.5);
      centralCore.add(mullion);
    }

    // Lounge Charcoal Wool Rug & Modular Curved Sectional
    const loungeShadow = createContactShadow(7.0, 6.4, 0.45);
    loungeShadow.position.set(-6.5, 0.015, 0);
    centralCore.add(loungeShadow);

    const loungeRug = createBeveledMesh(6.6, 0.03, 6.0, 0.3, M.rugDarkCharcoal, 0.015);
    loungeRug.position.set(-6.5, 0.02, 0);
    centralCore.add(loungeRug);
    registerInteractiveZone(loungeRug, 'lounge');

    // Soft rounded modular bouclé sofa with bolster cushions
    const sofaBack = createBeveledMesh(5.4, 0.65, 1.1, 0.22, M.fabricBoucle, 0.06);
    sofaBack.position.set(-6.5, 0.35, 2.1);
    centralCore.add(sofaBack);

    const sofaL = createBeveledMesh(1.1, 0.65, 4.3, 0.22, M.fabricBoucle, 0.06);
    sofaL.position.set(-8.6, 0.35, 0);
    centralCore.add(sofaL);

    const sofaR = createBeveledMesh(1.1, 0.65, 4.3, 0.22, M.fabricBoucle, 0.06);
    sofaR.position.set(-4.4, 0.35, 0);
    centralCore.add(sofaR);

    const rollBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 4.5, 8, 20), M.fabricBoucle);
    rollBack.rotation.z = Math.PI / 2;
    rollBack.position.set(-6.5, 0.72, 2.45);
    centralCore.add(rollBack);

    // Sculpted Pebble Double-Tier Coffee Table
    const coffeeTbl = createBeveledMesh(2.2, 0.36, 1.6, 0.55, M.woodEspresso, 0.05);
    coffeeTbl.position.set(-6.5, 0.2, 0);
    centralCore.add(coffeeTbl);

    // Monolithic Sculpted Walnut Dining Table & Contact Shadow
    const diningShadow = createContactShadow(2.4, 5.4, 0.45);
    diningShadow.position.set(-0.5, 0.015, 0);
    centralCore.add(diningShadow);

    const diningTop = createBeveledMesh(1.7, 0.1, 4.8, 0.65, M.woodEspresso, 0.03);
    diningTop.position.set(-0.5, 0.74, 0);
    centralCore.add(diningTop);

    [-1.3, 1.3].forEach((pz) => {
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.68, 24), M.bronzeBrushed);
      pedestal.position.set(-0.5, 0.34, pz);
      pedestal.castShadow = true;
      centralCore.add(pedestal);
    });

    // Sculptural Bronze Ring Chandelier
    const chandelier = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 14, 48), M.bronzeBrushed);
    chandelier.rotation.x = Math.PI / 2;
    chandelier.position.set(-0.5, 2.4, 0);
    centralCore.add(chandelier);

    const chHalo = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 10, 48), M.ledGlow);
    chHalo.rotation.x = Math.PI / 2;
    chHalo.position.set(-0.5, 2.38, 0);
    centralCore.add(chHalo);
    ledCoveMeshes.push(chHalo);

    const chLight = new THREE.PointLight(0xffedd5, 1.3, 9);
    chLight.position.set(-0.5, 2.3, 0);
    centralCore.add(chLight);
    interiorLights.push(chLight);

    // Sculpted Barrel Back Dining Chairs
    for (let dz = -1.8; dz <= 1.8; dz += 0.9) {
      [-1.25, 0.25].forEach((dx) => {
        const chair = new THREE.Group();
        chair.position.set(dx, 0.42, dz);

        const seat = createBeveledMesh(0.52, 0.14, 0.52, 0.18, M.fabricVelvet, 0.02);
        chair.add(seat);

        const back = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.44, 16, 1, false, 0, Math.PI),
          M.fabricVelvet
        );
        back.rotation.y = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
        back.position.set(0, 0.28, 0);
        chair.add(back);

        centralCore.add(chair);
      });
    }

    // Chef Kitchen Curved Waterfall Nero Marquina Island
    const islandShadow = createContactShadow(2.8, 5.5, 0.5);
    islandShadow.position.set(5.2, 0.015, 0);
    centralCore.add(islandShadow);

    const island = createBeveledMesh(2.2, 0.96, 4.9, 0.35, M.marbleBlackHoned, 0.05);
    island.position.set(5.2, 0.48, 0);
    centralCore.add(island);
    registerInteractiveZone(island, 'kitchen');

    addLedStrip(centralCore, 2.0, 4.6, 5.2, 0.08, 0);

    const faucetCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(5.5, 0.98, 0.3),
      new THREE.Vector3(5.5, 1.5, 0.3),
      new THREE.Vector3(5.2, 1.35, 0.3)
    );
    const faucetGeo = new THREE.TubeGeometry(faucetCurve, 20, 0.03, 10, false);
    const faucet = new THREE.Mesh(faucetGeo, M.bronzeBrushed);
    centralCore.add(faucet);

    const cooktop = createBeveledMesh(0.92, 0.04, 1.65, 0.08, M.wallCapBronze, 0.015);
    cooktop.position.set(5.4, 0.98, -1.0);
    centralCore.add(cooktop);

    [-1.65, -0.55, 0.55, 1.65].forEach((sz) => {
      const stoolPoints = [
        new THREE.Vector2(0.25, 0),
        new THREE.Vector2(0.06, 0.3),
        new THREE.Vector2(0.06, 0.6),
        new THREE.Vector2(0.26, 0.65)
      ];
      const stoolBaseGeo = new THREE.LatheGeometry(stoolPoints, 20);
      const stoolBase = new THREE.Mesh(stoolBaseGeo, M.bronzeBrushed);
      stoolBase.position.set(3.8, 0.02, sz);
      centralCore.add(stoolBase);

      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 20), M.fabricLeather);
      seat.position.set(3.8, 0.69, sz);
      seat.castShadow = true;
      centralCore.add(seat);
    });

    buildWall(centralCore, 0.26, 3.1, 9.2, 8.8, 0);
    buildWall(centralCore, 0.26, 3.1, 9.2, 10.8, 0);

    const wineCellar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 8.2), M.glassSmoked);
    wineCellar.position.set(10.2, 1.25, 0);
    centralCore.add(wineCellar);
    addLedStrip(centralCore, 0.5, 8.0, 10.2, 2.4, 0);

    const coreLight = new THREE.PointLight(0xffedd5, 1.6, 22);
    coreLight.position.set(0, 3.3, 0);
    centralCore.add(coreLight);
    interiorLights.push(coreLight);
    estateRoot.add(centralCore);

    // 6. East Wing (Bedrooms 2, 3, 4, 5 & Two Jack & Jill Baths)
    const eastWing = new THREE.Group();
    eastWing.position.set(20.5, 0.33, -5.5);

    buildWall(eastWing, 26, 3.1, 0.3, 0, -4.6);
    buildWall(eastWing, 26, 3.1, 0.25, 0, 4.2);

    [-10.5, -2.5, 2.5, 10.5].forEach((bx, idx) => {
      buildIntricateBed(eastWing, bx, -1.2, 0, idx % 2 === 0 ? 0xb45309 : 0x475569);
      buildWall(eastWing, 0.24, 3.1, 8.8, bx - 2.4, -0.2);
      buildWall(eastWing, 0.24, 3.1, 8.8, bx + 2.4, -0.2);
    });

    [-6.5, 6.5].forEach((jx, idx) => {
      const vanity = createBeveledMesh(2.2, 0.85, 0.6, 0.12, M.marbleBlackHoned, 0.03);
      vanity.position.set(jx, 0.42, -3.8);
      eastWing.add(vanity);

      const tubGeoEast = new THREE.LatheGeometry(tubPoints, 24);
      tubGeoEast.scale(1.2, 0.9, 0.8);
      const bath = new THREE.Mesh(tubGeoEast, M.marbleBlackHoned);
      bath.position.set(jx, 0.3, 1.2);
      eastWing.add(bath);

      const floorTag = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), M.rugDarkCharcoal);
      floorTag.rotation.x = -Math.PI / 2;
      floorTag.position.set(jx, 0.02, 0);
      eastWing.add(floorTag);
      registerInteractiveZone(floorTag, idx === 0 ? 'bed23' : 'bed45');
    });

    const eastLight = new THREE.PointLight(0xffedd5, 1.4, 24);
    eastLight.position.set(0, 3.2, 0);
    eastWing.add(eastLight);
    interiorLights.push(eastLight);
    estateRoot.add(eastWing);

    // 7. Curved Bedroom 6 (Guest Pavilion)
    const guestPavilion = new THREE.Group();
    guestPavilion.position.set(34.5, 0, 1.5);

    const gSlab = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.34, 48), M.wallDark);
    gSlab.position.y = 0.17;
    guestPavilion.add(gSlab);
    wallMeshes.push(gSlab);
    registerInteractiveZone(gSlab, 'guest');

    buildCurvedWall(guestPavilion, 7.3, 3.1, 0.3, -Math.PI * 0.15, Math.PI * 0.85, 0, 0, false);
    buildIntricateBed(guestPavilion, -1.2, 1.8, -Math.PI / 2, 0x831843);

    const curvedSofaGeo = new THREE.TorusGeometry(2.2, 0.45, 16, 24, Math.PI * 0.7);
    const curvedSofa = new THREE.Mesh(curvedSofaGeo, M.fabricBoucle);
    curvedSofa.rotation.x = Math.PI / 2;
    curvedSofa.rotation.z = -Math.PI * 0.45;
    curvedSofa.position.set(3.2, 0.45, -1.0);
    curvedSofa.castShadow = true;
    guestPavilion.add(curvedSofa);

    const gLight = new THREE.PointLight(0xffedd5, 1.3, 16);
    gLight.position.set(0, 3.2, 0);
    guestPavilion.add(gLight);
    interiorLights.push(gLight);
    estateRoot.add(guestPavilion);

    // 8. South Wing (Female Study, Powder, Foyer, Male Study, Kids Library)
    const southWing = new THREE.Group();
    southWing.position.set(-2, 0.33, 5.2);

    // Female Study
    buildWall(southWing, 6.4, 3.1, 0.28, -12.5, 3.8);
    buildWall(southWing, 0.28, 3.1, 7.6, -15.7, 0);
    buildWall(southWing, 0.28, 3.1, 7.6, -9.3, 0);
    const darkRug = createBeveledMesh(4.4, 0.03, 4.2, 0.3, M.rugDarkCharcoal, 0.015);
    darkRug.position.set(-12.5, 0.02, 0);
    southWing.add(darkRug);
    const fDesk = createBeveledMesh(2.2, 0.75, 1.0, 0.15, M.woodEspresso, 0.03);
    fDesk.position.set(-12.5, 0.38, 0);
    southWing.add(fDesk);
    registerInteractiveZone(darkRug, 'foyer');

    // Powder room
    buildWall(southWing, 0.24, 3.1, 7.6, -7.2, 0);
    const guestSink = createBeveledMesh(0.8, 0.82, 0.55, 0.15, M.marbleBlackHoned, 0.03);
    guestSink.position.set(-8.2, 0.41, -2.2);
    southWing.add(guestSink);

    // Male Study: Executive Walnut Desk & Ergonomic Leather Chair
    buildWall(southWing, 6.8, 3.1, 0.28, -1.5, 3.8);
    buildWall(southWing, 0.28, 3.1, 7.6, -4.9, 0);
    buildWall(southWing, 0.28, 3.1, 7.6, 1.9, 0);
    const mDesk = createBeveledMesh(2.4, 0.76, 1.1, 0.18, M.woodEspresso, 0.03);
    mDesk.position.set(-1.5, 0.38, 0.4);
    southWing.add(mDesk);

    const mDeskChair = createBeveledMesh(0.72, 0.95, 0.72, 0.15, M.fabricLeather, 0.04);
    mDeskChair.position.set(-1.5, 0.48, -0.4);
    southWing.add(mDeskChair);

    // Kids Library & Homework Table with Rounded Edges
    buildWall(southWing, 9.2, 3.1, 0.28, 6.5, 3.8);
    buildWall(southWing, 0.28, 3.1, 7.6, 11.1, 0);
    const studyTable = createBeveledMesh(3.8, 0.74, 1.35, 0.25, M.woodEspresso, 0.03);
    studyTable.position.set(6.5, 0.37, 0.5);
    southWing.add(studyTable);
    registerInteractiveZone(studyTable, 'library');

    const bookcase = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.6, 0.45), M.woodEspresso);
    bookcase.position.set(6.5, 1.3, -3.4);
    southWing.add(bookcase);

    estateRoot.add(southWing);

    // 9. Laundry & Drying Court
    const laundryWing = new THREE.Group();
    laundryWing.position.set(21.5, 0.33, 6.0);

    buildWall(laundryWing, 13, 2.6, 0.28, 0, 4.8);
    buildWall(laundryWing, 0.28, 2.6, 9.6, -6.5, 0);
    buildWall(laundryWing, 0.28, 2.6, 9.6, 6.5, 0);
    buildWall(laundryWing, 0.26, 2.8, 7.5, -0.5, -1.0);

    const lFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), M.marbleBlackHoned);
    lFloor.rotation.x = -Math.PI / 2;
    lFloor.position.set(0, 0.02, 0);
    laundryWing.add(lFloor);
    registerInteractiveZone(lFloor, 'laundry');

    [1.2, 2.4, 3.6].forEach((wx) => {
      const machine = createBeveledMesh(0.95, 0.95, 0.9, 0.1, M.fabricLeather, 0.03);
      machine.position.set(wx, 0.48, -3.2);
      laundryWing.add(machine);
    });

    [-4.2, -2.4].forEach((dx) => {
      const dryingRack = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.3, 1.45), M.bronzeBrushed);
      dryingRack.position.set(dx, 0.65, 0.5);
      laundryWing.add(dryingRack);
    });

    estateRoot.add(laundryWing);

    // 10. 3-Car Garage & Grand Music Studio
    const garageBlock = new THREE.Group();
    garageBlock.position.set(-28.5, 0, 6.5);

    const gSlab2 = new THREE.Mesh(
      new THREE.BoxGeometry(21, 0.32, 11.5),
      new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.55 })
    );
    gSlab2.position.y = 0.16;
    gSlab2.receiveShadow = true;
    garageBlock.add(gSlab2);
    registerInteractiveZone(gSlab2, 'garages');

    buildWall(garageBlock, 21, 3.1, 0.3, 0, -5.6);
    [-10.3, -4.5, 1.3, 7.1, 10.4].forEach((gx) => {
      buildWall(garageBlock, 0.3, 3.1, 11.2, gx, 0);
      addDarkBronzeSconce(garageBlock, gx, 1.6, 5.7);
    });

    buildSculptedCar(garageBlock, -7.4, 0.4, 0x0a0c10);
    buildSculptedCar(garageBlock, -1.6, 0.4, 0x475569);
    buildSculptedCar(garageBlock, 4.2, 0.4, 0x064e3b);

    // Sculpted Grand Piano with Classical Curved Rim Contour
    const pianoRimShape = new THREE.Shape();
    pianoRimShape.moveTo(-0.7, -1.0);
    pianoRimShape.lineTo(0.7, -1.0);
    pianoRimShape.lineTo(0.7, 0.2);
    pianoRimShape.quadraticCurveTo(0.65, 1.0, 0.1, 1.1);
    pianoRimShape.quadraticCurveTo(-0.6, 1.0, -0.7, 0.4);
    pianoRimShape.lineTo(-0.7, -1.0);

    const pianoGeo = new THREE.ExtrudeGeometry(pianoRimShape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.05,
      bevelThickness: 0.05
    });
    pianoGeo.rotateX(Math.PI / 2);
    pianoGeo.center();
    const pianoBody = new THREE.Mesh(
      pianoGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0x05070a,
        roughness: 0.05,
        metalness: 0.98,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03
      })
    );
    pianoBody.position.set(8.75, 0.72, -2.2);
    pianoBody.castShadow = true;
    garageBlock.add(pianoBody);

    [[-0.5, -0.8], [0.5, -0.8], [0, 0.8]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.68, 16), M.bronzeBrushed);
      leg.position.set(8.75 + lx, 0.34, -2.2 + lz);
      garageBlock.add(leg);
    });

    const studioDesk = createBeveledMesh(1.85, 0.78, 0.92, 0.1, M.woodEspresso, 0.03);
    studioDesk.position.set(8.75, 0.7, 1.5);
    garageBlock.add(studioDesk);

    estateRoot.add(garageBlock);

    // 11. Outdoor Resort: Pool, Sunken Circular Fire Pit, Pergola & Gym
    const northResort = new THREE.Group();
    northResort.position.set(0, 0, -17.5);

    const poolDeck = new THREE.Mesh(
      new THREE.BoxGeometry(23, 0.24, 11.5),
      new THREE.MeshStandardMaterial({ color: 0x1c212b, roughness: 0.6 })
    );
    poolDeck.position.set(-14, 0.12, 0);
    poolDeck.receiveShadow = true;
    northResort.add(poolDeck);
    registerInteractiveZone(poolDeck, 'pool');

    const poolBasin = new THREE.Mesh(
      new THREE.BoxGeometry(16.5, 0.1, 6.8),
      new THREE.MeshStandardMaterial({ map: createPoolTilesTexture(maxAnisotropy), roughness: 0.3 })
    );
    poolBasin.position.set(-13.2, 0.06, -1.2);
    northResort.add(poolBasin);

    // Dynamic Transmissive Water with Physical Material & Clearcoat
    const poolWaterMesh = new THREE.Mesh(
      new THREE.BoxGeometry(16.5, 0.16, 6.8),
      new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.45,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.75,
        thickness: 0.6,
        ior: 1.333,
        clearcoat: 0.95,
        clearcoatRoughness: 0.05
      })
    );
    poolWaterMesh.position.set(-13.2, 0.2, -1.2);
    northResort.add(poolWaterMesh);

    const poolCoping = createBeveledMesh(17.2, 0.06, 7.5, 0.35, M.wallCapBronze, 0.04);
    poolCoping.position.set(-13.2, 0.25, -1.2);
    northResort.add(poolCoping);

    addLedStrip(northResort, 16.0, 0.06, -13.2, 0.22, -4.4);
    addLedStrip(northResort, 16.0, 0.06, -13.2, 0.22, 2.0);

    [-3.2, -1.2, 0.8].forEach((lz) => {
      const lounger = createBeveledMesh(1.9, 0.28, 0.76, 0.15, M.fabricLeather, 0.04);
      lounger.position.set(-23.5, 0.38, lz);
      northResort.add(lounger);
    });

    [-18.5, -15.0, -11.5, -8.0].forEach((dx) => {
      const daybed = createBeveledMesh(2.4, 0.38, 1.32, 0.2, M.fabricBoucle, 0.04);
      daybed.position.set(dx, 0.4, 3.8);
      northResort.add(daybed);
    });

    const pGlow = new THREE.PointLight(0x0284c7, 2.4, 18);
    pGlow.position.set(-13.2, 1.2, -1.2);
    northResort.add(pGlow);
    poolLights.push(pGlow);

    const teakDeck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.26, 11), M.woodTeakDark);
    teakDeck.position.set(1.5, 0.13, 0);
    teakDeck.receiveShadow = true;
    northResort.add(teakDeck);

    [[-4.5, -4.5], [7.5, -4.5], [-4.5, 4.5], [7.5, 4.5]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 16), M.bronzeBrushed);
      post.position.set(px, 1.6, pz);
      post.castShadow = true;
      northResort.add(post);
    });

    for (let sl = -4.2; sl <= 4.2; sl += 0.45) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.1, 0.14), M.woodTeakDark);
      slat.position.set(1.5, 3.2, sl);
      slat.castShadow = true;
      northResort.add(slat);
    }

    const alfrescoTbl = createBeveledMesh(1.6, 0.76, 3.6, 0.35, M.woodEspresso, 0.04);
    alfrescoTbl.position.set(-2.5, 0.58, -0.5);
    northResort.add(alfrescoTbl);

    // Circular Sunken Fire Pit with Dual Dancing Light Sources
    const pitRimGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.45, 32);
    const fireBasaltSurround = new THREE.Mesh(pitRimGeo, M.marbleBlackHoned);
    fireBasaltSurround.position.set(3.5, 0.45, -0.5);
    northResort.add(fireBasaltSurround);

    const fireEmbers = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, emissive: 0xc2410c, emissiveIntensity: 2.2 })
    );
    fireEmbers.position.set(3.5, 0.65, -0.5);
    northResort.add(fireEmbers);

    const fireFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xea580c, emissiveIntensity: 2.8 })
    );
    fireFlame.position.set(3.5, 0.95, -0.5);
    northResort.add(fireFlame);

    const firePoint1 = new THREE.PointLight(0xea580c, 2.2, 14);
    firePoint1.position.set(3.5, 1.6, -0.5);
    northResort.add(firePoint1);
    poolLights.push(firePoint1);

    const firePoint2 = new THREE.PointLight(0xf59e0b, 1.4, 10);
    firePoint2.position.set(3.5, 1.3, -0.5);
    northResort.add(firePoint2);
    poolLights.push(firePoint2);

    // Outdoor Fitness Gym
    const gymGroup = new THREE.Group();
    gymGroup.position.set(15.5, 0, 0);

    const gymSlab = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.28, 10.5),
      new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 0.9 })
    );
    gymSlab.position.y = 0.14;
    gymGroup.add(gymSlab);
    registerInteractiveZone(gymSlab, 'gym');

    buildWall(gymGroup, 12, 2.9, 0.28, 0, -5.1);
    buildWall(gymGroup, 0.28, 2.9, 10.5, -5.9, 0);
    buildWall(gymGroup, 0.28, 2.9, 10.5, 5.9, 0);

    [-3.8, -1.2, 1.4, 3.8].forEach((gx) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 1.6), M.bronzeBrushed);
      rack.position.set(gx, 1.2, -1.2);
      rack.castShadow = true;
      gymGroup.add(rack);
    });
    northResort.add(gymGroup);

    // 10 Raised Crop Beds & 3 Greenhouses
    const agriGroup = new THREE.Group();
    agriGroup.position.set(32, 0, 0);

    const agriBase = new THREE.Mesh(new THREE.BoxGeometry(22, 0.1, 12), M.woodTeakDark);
    agriBase.position.set(0, 0.05, 0);
    agriGroup.add(agriBase);
    registerInteractiveZone(agriBase, 'crops');

    [-4.2, 3.2].forEach((colX) => {
      [-4.4, -2.2, 0, 2.2, 4.4].forEach((rowZ) => {
        const box = createBeveledMesh(6.4, 0.42, 1.45, 0.15, M.woodEspresso, 0.03);
        box.position.set(colX, 0.21, rowZ);
        agriGroup.add(box);

        const crop = createBeveledMesh(5.9, 0.36, 0.9, 0.25, new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }), 0.04);
        crop.position.set(colX, 0.52, rowZ);
        agriGroup.add(crop);
        foliageMeshes.push(crop);
      });
    });

    [-2.8, 2.8].forEach((ghz) => {
      const gh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.3, 4.2), M.glassSmoked);
      gh.position.set(9.8, 1.15, ghz);
      agriGroup.add(gh);
    });

    const seGreenhouse = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.5, 6.2), M.glassSmoked);
    seGreenhouse.position.set(42.5, 1.25, 16.5);
    estateRoot.add(seGreenhouse);

    northResort.add(agriGroup);
    estateRoot.add(northResort);

    // Multi-tiered Dark Italian Cypress Columns
    [
      [-42, -22], [-30, -22], [-24, -14], [-3, -22], [8, -22],
      [22, -22], [43, -22], [42, -6], [42, 11], [-42, 14],
      [-12, 11], [-5, 11], [-12, 19], [-5, 19], [13, 10]
    ].forEach(([px, pz]) => buildDarkCypress(estateRoot, px, pz, 0.95 + Math.random() * 0.25));

    // Cutaway Roof Slab
    const roof = createBeveledMesh(64, 0.45, 22, 0.3, M.wallCapBronze, 0.05);
    roof.position.set(4, 3.6, -1);
    roofGroup.add(roof);

    // Ambient Starlight Sky Dome Particles
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starCoords = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 180 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // Upper celestial dome
      starCoords[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starCoords[i * 3 + 1] = Math.max(25, radius * Math.cos(phi));
      starCoords[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.6,
      transparent: true,
      opacity: 0.8
    });
    const starsParticles = new THREE.Points(starGeo, starMat);
    scene.add(starsParticles);

    // Weather Particles (Rain / Snow / Leaves)
    const pCount = 2200;
    const pGeo = new THREE.BufferGeometry();
    const pCoords = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pCoords[i * 3] = (Math.random() - 0.5) * 105;
      pCoords[i * 3 + 1] = Math.random() * 35;
      pCoords[i * 3 + 2] = (Math.random() - 0.5) * 75;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pCoords, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.2,
      transparent: true,
      opacity: 0.75
    });
    const weatherParticles = new THREE.Points(pGeo, pMat);
    weatherParticles.visible = false;
    scene.add(weatherParticles);

    // Directional Sun Light with High-Resolution Soft Shadows
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    const shadowBounds = 54;
    sunLight.shadow.camera.left = -shadowBounds;
    sunLight.shadow.camera.right = shadowBounds;
    sunLight.shadow.camera.top = shadowBounds;
    sunLight.shadow.camera.bottom = -shadowBounds;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 0.65);
    scene.add(hemiLight);

    // Store references
    sceneRefs.current = {
      scene,
      camera,
      renderer,
      sunLight,
      hemiLight,
      mainFloorMesh,
      poolWaterMesh,
      fireFlameMesh: fireFlame,
      fireEmbersMesh: fireEmbers,
      firePoint1,
      firePoint2,
      roofGroup,
      starsParticles,
      weatherParticles,
      interiorLights,
      sconceLights,
      poolLights,
      ledCoveMeshes,
      foliageMeshes,
      wallMeshes,
      wallCapMeshes,
      roomInteractiveMeshes
    };

    renderer.compile(scene, camera);

    // Pointer & Keyboard Controls
    const dom = renderer.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      navRef.current.dragging = true;
      navRef.current.lastX = e.clientX;
      navRef.current.lastY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!navRef.current.dragging) return;
      const dx = e.clientX - navRef.current.lastX;
      const dy = e.clientY - navRef.current.lastY;
      navRef.current.lastX = e.clientX;
      navRef.current.lastY = e.clientY;

      if (stateRef.current.viewMode === 'firstPerson') {
        navRef.current.fpsYaw -= dx * 0.0038;
        navRef.current.fpsPitch = Math.max(-1.1, Math.min(1.1, navRef.current.fpsPitch - dy * 0.0038));
      } else {
        navRef.current.theta -= dx * 0.005;
        navRef.current.phi = Math.max(0.06, Math.min(1.42, navRef.current.phi - dy * 0.005));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const clickDist = Math.hypot(e.clientX - navRef.current.lastX, e.clientY - navRef.current.lastY);
      if (clickDist < 5 && stateRef.current.viewMode !== 'firstPerson') {
        const rect = dom.getBoundingClientRect();
        _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        _raycaster.setFromCamera(_mouse, camera);

        const meshes = roomInteractiveMeshes.map((r) => r.mesh);
        const intersects = _raycaster.intersectObjects(meshes, true);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const match = roomInteractiveMeshes.find((r) => r.mesh === hit || hit.parent === r.mesh);
          if (match) {
            const foundRoom = ESTATE_ROOMS.find((rm) => rm.id === match.roomId);
            if (foundRoom) {
              onSelectRoom(foundRoom);
            }
          }
        }
      }
      navRef.current.dragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (stateRef.current.viewMode !== 'firstPerson') {
        navRef.current.radius = Math.max(11, Math.min(95, navRef.current.radius + e.deltaY * 0.04));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      navRef.current.keys[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      navRef.current.keys[e.code] = false;
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    // Animation & Render Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const current = stateRef.current;
      const nav = navRef.current;

      if (current.cinematicTour && current.viewMode === 'orbit' && !nav.dragging) {
        nav.theta += 0.09 * dt;
      }

      // Dynamic water ripples and surface refraction
      if (poolWaterMesh) {
        poolWaterMesh.position.y = 0.2 + Math.sin(elapsed * 2.3) * 0.012;
      }

      // Dynamic flickering fire pit flame and dancing warm light
      if (fireFlame) {
        fireFlame.scale.set(
          1 + Math.sin(elapsed * 9) * 0.1,
          1 + Math.cos(elapsed * 12) * 0.16,
          1 + Math.sin(elapsed * 10) * 0.1
        );
      }
      if (firePoint1 && firePoint2) {
        firePoint1.intensity = 2.2 + Math.sin(elapsed * 11) * 0.4;
        firePoint2.intensity = 1.4 + Math.cos(elapsed * 8) * 0.3;
      }

      if (weatherParticles.visible) {
        const arr = weatherParticles.geometry.attributes.position.array as Float32Array;
        const speed = current.weather === 'rainy' ? 38 * dt : 5.5 * dt;
        for (let i = 0; i < pCount; i++) {
          arr[i * 3 + 1] -= speed;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 34;
        }
        weatherParticles.geometry.attributes.position.needsUpdate = true;
      }

      if (current.viewMode === 'firstPerson') {
        const moveSpeed = (nav.keys['ShiftLeft'] || nav.keys['ShiftRight'] ? 16 : 9) * dt;
        _fpsFwd.set(-Math.sin(nav.fpsYaw), 0, -Math.cos(nav.fpsYaw));
        _fpsRight.set(_fpsFwd.z, 0, -_fpsFwd.x);

        if (nav.keys['KeyW'] || nav.keys['ArrowUp']) nav.fpsPos.addScaledVector(_fpsFwd, moveSpeed);
        if (nav.keys['KeyS'] || nav.keys['ArrowDown']) nav.fpsPos.addScaledVector(_fpsFwd, -moveSpeed);
        if (nav.keys['KeyA'] || nav.keys['ArrowLeft']) nav.fpsPos.addScaledVector(_fpsRight, -moveSpeed);
        if (nav.keys['KeyD'] || nav.keys['ArrowRight']) nav.fpsPos.addScaledVector(_fpsRight, moveSpeed);

        camera.position.copy(nav.fpsPos);
        _cameraTarget.set(
          nav.fpsPos.x - Math.sin(nav.fpsYaw) * Math.cos(nav.fpsPitch),
          nav.fpsPos.y + Math.sin(nav.fpsPitch),
          nav.fpsPos.z - Math.cos(nav.fpsYaw) * Math.cos(nav.fpsPitch)
        );
        camera.lookAt(_cameraTarget);
      } else {
        const factor = 1 - Math.exp(-9 * dt);
        nav.smoothTarget.lerp(nav.target, factor);
        nav.smoothRadius = THREE.MathUtils.lerp(nav.smoothRadius, nav.radius, factor);
        nav.smoothTheta = THREE.MathUtils.lerp(nav.smoothTheta, nav.theta, factor);
        nav.smoothPhi = THREE.MathUtils.lerp(nav.smoothPhi, nav.phi, factor);

        _desiredCamPos.set(
          nav.smoothTarget.x + nav.smoothRadius * Math.sin(nav.smoothPhi) * Math.sin(nav.smoothTheta),
          nav.smoothTarget.y + nav.smoothRadius * Math.cos(nav.smoothPhi),
          nav.smoothTarget.z + nav.smoothRadius * Math.sin(nav.smoothPhi) * Math.cos(nav.smoothTheta)
        );

        camera.position.copy(_desiredCamPos);
        camera.lookAt(nav.smoothTarget);
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [onSelectRoom]);

  // Synchronize dynamic environment, lighting, weather, darker hues & finishes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    const {
      scene,
      sunLight,
      hemiLight,
      mainFloorMesh,
      roofGroup,
      starsParticles,
      weatherParticles,
      interiorLights,
      sconceLights,
      poolLights,
      ledCoveMeshes,
      foliageMeshes,
      wallMeshes,
      wallCapMeshes
    } = refs;

    roofGroup.visible = appState.roofVisible;
    interiorLights.forEach((l) => (l.visible = appState.interiorLights));
    sconceLights.forEach((l) => (l.visible = appState.sconceLights));
    poolLights.forEach((l) => (l.visible = appState.poolLights));

    let wallColor = 0x141820;
    let capColor = 0x241a12;
    if (appState.facadeTheme === 'dark-charcoal') {
      wallColor = 0x1c212a;
      capColor = 0x0c0e12;
    } else if (appState.facadeTheme === 'warm-limestone') {
      wallColor = 0x35312a;
      capColor = 0x1e1914;
    }
    wallMeshes.forEach((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.setHex(wallColor));
    wallCapMeshes.forEach((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.setHex(capColor));

    const ledColorMap: Record<string, { hex: number; emissive: number }> = {
      'warm-amber': { hex: 0xffedd5, emissive: 0xf59e0b },
      'golden-champagne': { hex: 0xfef3c7, emissive: 0xd97706 },
      'crisp-white': { hex: 0xf8fafc, emissive: 0xe2e8f0 },
      'midnight-cyan': { hex: 0xcffafe, emissive: 0x06b6d4 }
    };
    const activeLed = ledColorMap[appState.ledCoveColor] || ledColorMap['warm-amber'];
    ledCoveMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(activeLed.hex);
      mat.emissive.setHex(activeLed.emissive);
    });

    const t = appState.timeOfDay;
    const sunAngle = ((t - 6) / 12) * Math.PI;
    const isNight = t < 5.8 || t > 19.5;
    const isGolden = (t >= 17 && t <= 19.5) || (t >= 5.8 && t <= 7.5);

    // Starlight celestial visibility
    starsParticles.visible = isNight || appState.weather === 'noir';

    if (isNight || appState.weather === 'noir') {
      sunLight.position.set(22, 42, 18);
      sunLight.intensity = 0.32;
      sunLight.color.setHex(0x38bdf8);
      hemiLight.intensity = 0.24;
      hemiLight.color.setHex(0x1e293b);
      const darkSky = 0x04060a;
      scene.background = new THREE.Color(darkSky);
      (scene.fog as THREE.FogExp2).color.setHex(darkSky);
    } else {
      sunLight.position.set(Math.cos(sunAngle) * 58, Math.max(12, Math.sin(sunAngle) * 58), 18);
      if (appState.weather === 'sunny') {
        sunLight.intensity = isGolden ? 1.7 : 2.1;
        sunLight.color.setHex(isGolden ? 0xf59e0b : 0xffedd5);
        hemiLight.intensity = 0.7;
        const sky = isGolden ? 0x140e1b : 0x070c14;
        scene.background = new THREE.Color(sky);
        (scene.fog as THREE.FogExp2).color.setHex(sky);
      } else if (appState.weather === 'rainy') {
        sunLight.intensity = 0.55;
        sunLight.color.setHex(0x64748b);
        hemiLight.intensity = 0.45;
        const sky = 0x090d14;
        scene.background = new THREE.Color(sky);
        (scene.fog as THREE.FogExp2).color.setHex(sky);
      } else {
        sunLight.intensity = 0.95;
        sunLight.color.setHex(0xcbd5e1);
        hemiLight.intensity = 0.75;
        const sky = 0x111622;
        scene.background = new THREE.Color(sky);
        (scene.fog as THREE.FogExp2).color.setHex(sky);
      }
    }

    const seasonTints = {
      spring: 0x22c55e,
      summer: 0x14532d,
      autumn: 0x9a3412,
      winter: 0x94a3b8
    };
    foliageMeshes.forEach((mesh) => {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(seasonTints[appState.season]);
    });

    weatherParticles.visible =
      appState.weather === 'rainy' || appState.season === 'winter' || appState.season === 'autumn';

    const pMat = weatherParticles.material as THREE.PointsMaterial;
    if (appState.weather === 'rainy') {
      pMat.color.setHex(0x7dd3fc);
      pMat.size = 0.18;
    } else if (appState.season === 'winter') {
      pMat.color.setHex(0xe2e8f0);
      pMat.size = 0.28;
    } else if (appState.season === 'autumn') {
      pMat.color.setHex(0xb45309);
      pMat.size = 0.32;
    }

    if (mainFloorMesh) {
      const mat = mainFloorMesh.material as THREE.MeshStandardMaterial;
      mat.map = createFloorCanvasTexture(appState.floorFinish);
      mat.needsUpdate = true;
    }

    const nav = navRef.current;
    if (appState.viewMode === 'plan') {
      nav.target.set(0, 0, -1);
      nav.radius = 68;
      nav.phi = 0.06;
      nav.theta = 0;
    } else if (appState.viewMode === 'orbit') {
      const activeRoom = ESTATE_ROOMS.find((r) => r.id === appState.activeRoomId);
      if (activeRoom) {
        nav.target.set(...activeRoom.center);
        nav.radius = activeRoom.radius;
        nav.phi = activeRoom.phi;
        nav.theta = activeRoom.theta;
      }
    } else if (appState.viewMode === 'firstPerson') {
      const activeRoom = ESTATE_ROOMS.find((r) => r.id === appState.activeRoomId);
      if (activeRoom) {
        nav.fpsPos.set(activeRoom.center[0], 1.75, activeRoom.center[2] + 2.5);
      }
    }
  }, [appState]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none"
      aria-label="Interactive 3D Architectural Model"
    />
  );
};
