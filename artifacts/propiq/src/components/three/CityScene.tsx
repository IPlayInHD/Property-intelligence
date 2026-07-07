import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Holographic Dubai — a gold wireframe city rising from a data grid.
 * The camera flies through it, driven by page scroll (state.p: 0→1),
 * with mouse parallax (state.mx / state.my: -1→1).
 */

export type SceneState = { p: number; mx: number; my: number };

const GOLD = new THREE.Color("#C9A84C");
const GOLD_BRIGHT = new THREE.Color("#F1D48A");
const CYAN = new THREE.Color("#4FE3E9");
const NAVY_SOLID = new THREE.Color("#060F1F");
const FOG_COLOR = "#050B16";

// Deterministic PRNG so the city is identical every visit
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The three featured towers (matched to the demo properties)
export const FEATURED = [
  { pos: [-24, 0, -10] as const, h: 30, label: "Dubai Marina" },
  { pos: [20, 0, -20] as const, h: 24, label: "Downtown" },
  { pos: [10, 0, 18] as const, h: 19, label: "JVC" },
];

/** Merge box edges + solid occluders for the whole city into 2 draw calls */
function buildCity(count: number) {
  const rand = mulberry32(1337);

  const unitEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const eSrc = unitEdges.attributes.position.array as Float32Array;
  const unitSolid = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const sSrc = unitSolid.attributes.position.array as Float32Array;
  const nSrc = unitSolid.attributes.normal.array as Float32Array;

  const edgePos: number[] = [];
  const edgeCol: number[] = [];
  const solidPos: number[] = [];
  const solidNorm: number[] = [];

  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 8) {
    const gx = (rand() - 0.5) * 240;
    const gz = (rand() - 0.5) * 240;
    const dist = Math.hypot(gx, gz);
    if (dist < 8) continue; // keep the plaza clear for the spire
    // keep clear of featured towers
    if (FEATURED.some(f => Math.hypot(gx - f.pos[0], gz - f.pos[2]) < 6)) continue;

    const centrality = Math.max(0, 1 - dist / 130);
    const h = 2.5 + rand() * 5 + centrality * centrality * (14 + rand() * 16);
    const w = 2 + rand() * 3;
    const d = 2 + rand() * 3;

    // per-building line colour: embers of gold, occasional cyan data-tower
    const isCyan = rand() < 0.06;
    const dim = 0.35 + rand() * 0.65;
    const c = isCyan ? CYAN : GOLD;
    const r = c.r * dim, g = c.g * dim, b = c.b * dim;

    for (let i = 0; i < eSrc.length; i += 3) {
      edgePos.push(eSrc[i] * w + gx, (eSrc[i + 1] + 0.5) * h, eSrc[i + 2] * d + gz);
      edgeCol.push(r, g, b);
    }
    for (let i = 0; i < sSrc.length; i += 3) {
      solidPos.push(sSrc[i] * w + gx, (sSrc[i + 1] + 0.5) * h, sSrc[i + 2] * d + gz);
      solidNorm.push(nSrc[i], nSrc[i + 1], nSrc[i + 2]);
    }
    placed++;
  }

  const edges = new THREE.BufferGeometry();
  edges.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
  edges.setAttribute("color", new THREE.Float32BufferAttribute(edgeCol, 3));

  const solids = new THREE.BufferGeometry();
  solids.setAttribute("position", new THREE.Float32BufferAttribute(solidPos, 3));
  solids.setAttribute("normal", new THREE.Float32BufferAttribute(solidNorm, 3));

  return { edges, solids };
}

function City({ count }: { count: number }) {
  const { edges, solids } = useMemo(() => buildCity(count), [count]);
  return (
    <group>
      {/* dark solid cores — occlude what's behind them */}
      <mesh geometry={solids}>
        <meshBasicMaterial color={NAVY_SOLID} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      {/* the golden wireframe city */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial vertexColors transparent opacity={0.85} />
      </lineSegments>
    </group>
  );
}

/** One featured tower: glowing core + bright edges + light beacon */
function FeaturedTower({ pos, h, index }: { pos: readonly [number, number, number]; h: number; index: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const beaconRef = useRef<THREE.MeshBasicMaterial>(null);
  const w = 5, d = 5;

  const edgesGeo = useMemo(() => {
    const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    g.translate(pos[0], h / 2, pos[2]);
    return g;
  }, [pos, h]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.55 + Math.sin(t * 1.6 + index * 2.1) * 0.35;
    if (matRef.current) matRef.current.emissiveIntensity = pulse;
    if (beaconRef.current) beaconRef.current.opacity = 0.12 + pulse * 0.18;
  });

  return (
    <group>
      <mesh position={[pos[0], h / 2, pos[2]]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial ref={matRef} color="#16294B" emissive={GOLD} emissiveIntensity={0.6} />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.95} />
      </lineSegments>
      {/* beacon of light rising from the roof */}
      <mesh position={[pos[0], h + 14, pos[2]]}>
        <cylinderGeometry args={[0.35, 1.1, 28, 12, 1, true]} />
        <meshBasicMaterial ref={beaconRef} color={GOLD_BRIGHT} transparent opacity={0.2} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Central spire — the Burj silhouette anchoring the skyline */
function Spire() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 0.8 + Math.sin(clock.getElapsedTime() * 1.1) * 0.25;
  });
  return (
    <group>
      <mesh position={[0, 19, 0]}>
        <cylinderGeometry args={[0.5, 3.2, 38, 6]} />
        <meshStandardMaterial ref={mat} color="#101F3D" emissive={GOLD} emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 19, 0]}>
        <cylinderGeometry args={[0.52, 3.25, 38, 6]} />
        <meshBasicMaterial color={GOLD_BRIGHT} wireframe transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 42.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 9, 4]} />
        <meshBasicMaterial color={GOLD_BRIGHT} />
      </mesh>
    </group>
  );
}

/** Rising data motes — the city breathing information upward */
function DataMotes({ count, color, speedScale }: { count: number; color: THREE.Color; speedScale: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, speeds } = useMemo(() => {
    const rand = mulberry32(7 + speedScale * 100);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 220;
      positions[i * 3 + 1] = rand() * 45;
      positions[i * 3 + 2] = (rand() - 0.5) * 220;
      speeds[i] = (2 + rand() * 6) * speedScale;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geo, speeds };
  }, [count, speedScale]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      if (arr[i * 3 + 1] > 50) arr[i * 3 + 1] = 0;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={color} size={0.55} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/** Distant starfield */
function Stars() {
  const geo = useMemo(() => {
    const rand = mulberry32(99);
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(1 - rand()); // upper hemisphere
      const r = 380;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#AFC8E8" size={0.9} transparent opacity={0.7} depthWrite={false} sizeAttenuation={false} />
    </points>
  );
}

// ── Camera flight path (keyframes across scroll progress) ───────────────────
const KEYS = [
  { pos: new THREE.Vector3(0, 40, 100), look: new THREE.Vector3(0, 14, 0) },     // 0.00 wide aerial
  { pos: new THREE.Vector3(-44, 18, 26), look: new THREE.Vector3(-24, 14, -10) }, // 0.25 tower 1 (Marina)
  { pos: new THREE.Vector3(38, 14, 2), look: new THREE.Vector3(20, 11, -20) },    // 0.50 tower 2 (Downtown)
  { pos: new THREE.Vector3(-6, 9, 40), look: new THREE.Vector3(10, 9, 18) },      // 0.75 tower 3 (JVC)
  { pos: new THREE.Vector3(0, 62, 118), look: new THREE.Vector3(0, 12, 0) },      // 1.00 pull back
];

const smooth = (t: number) => t * t * (3 - 2 * t);

function CameraRig({ state, reduced }: { state: React.MutableRefObject<SceneState>; reduced: boolean }) {
  const sp = useRef(0);
  const smx = useRef(0);
  const smy = useRef(0);
  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  useFrame(({ camera, clock }) => {
    const target = reduced ? 0.02 : state.current.p;
    sp.current += (target - sp.current) * 0.07;
    smx.current += (state.current.mx - smx.current) * 0.05;
    smy.current += (state.current.my - smy.current) * 0.05;

    const p = Math.min(Math.max(sp.current, 0), 1);
    const seg = Math.min(Math.floor(p * (KEYS.length - 1)), KEYS.length - 2);
    const local = smooth(p * (KEYS.length - 1) - seg);

    tmpPos.current.lerpVectors(KEYS[seg].pos, KEYS[seg + 1].pos, local);
    tmpLook.current.lerpVectors(KEYS[seg].look, KEYS[seg + 1].look, local);

    // gentle idle drift + mouse parallax
    const t = clock.getElapsedTime();
    tmpPos.current.x += Math.sin(t * 0.22) * 1.2 + smx.current * 4;
    tmpPos.current.y += Math.cos(t * 0.18) * 0.6 + smy.current * -2;

    camera.position.copy(tmpPos.current);
    camera.lookAt(tmpLook.current);
  });
  return null;
}

function SceneContents({ state, reduced, mobile }: { state: React.MutableRefObject<SceneState>; reduced: boolean; mobile: boolean }) {
  return (
    <>
      <fog attach="fog" args={[FOG_COLOR, 70, 300]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 55, 0]} color="#E8C87A" intensity={1400} distance={320} />
      <directionalLight position={[70, 45, 90]} color="#3ABBD1" intensity={0.5} />

      <Stars />
      <gridHelper args={[440, 88, "#6B5A2A", "#122540"]} position={[0, 0.01, 0]} />
      <City count={mobile ? 130 : 230} />
      <Spire />
      {FEATURED.map((f, i) => (
        <FeaturedTower key={i} pos={f.pos} h={f.h} index={i} />
      ))}
      {!reduced && (
        <>
          <DataMotes count={mobile ? 60 : 120} color={GOLD_BRIGHT} speedScale={1} />
          <DataMotes count={mobile ? 25 : 50} color={CYAN} speedScale={1.6} />
        </>
      )}
      <CameraRig state={state} reduced={reduced} />
    </>
  );
}

export default function CityScene({ state }: { state: React.MutableRefObject<SceneState> }) {
  const [webgl, setWebgl] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))));
    } catch {
      setWebgl(false);
    }
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMobile(window.innerWidth < 768);
  }, []);

  if (!webgl) {
    // graceful fallback: layered gradient night sky
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 20%, rgba(201,168,76,0.14), transparent 65%), linear-gradient(180deg, #050B16 0%, #0A1628 60%, #0C1B33 100%)",
        }}
      />
    );
  }

  return (
    <Canvas
      dpr={mobile ? [1, 1.5] : [1, 2]}
      camera={{ fov: 50, near: 0.5, far: 600, position: [0, 40, 100] }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: FOG_COLOR }}
    >
      <SceneContents state={state} reduced={reduced} mobile={mobile} />
    </Canvas>
  );
}
