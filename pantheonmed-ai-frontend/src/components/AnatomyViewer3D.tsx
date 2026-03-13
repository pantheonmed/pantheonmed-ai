"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ── Organ definitions ─────────────────────────────────────────────────────────
export interface OrganDef3D {
  meshId: string;
  organId: string;
  label: string;
  emoji: string;
  color: number;
  hoverColor: number;
  emissive: number;
  position: [number, number, number];
  scale: [number, number, number];
  geoRadius: number;
}

export const ORGAN_DEFS_3D: OrganDef3D[] = [
  {
    meshId: "brain", organId: "brain", label: "Brain", emoji: "🧠",
    color: 0xCDA0DC, hoverColor: 0xA855F7, emissive: 0x1E0030,
    position: [0, 1.73, 0.08],
    scale: [1.0, 0.88, 0.82], geoRadius: 0.23,
  },
  {
    meshId: "heart", organId: "heart", label: "Heart", emoji: "❤️",
    color: 0xFF5A5A, hoverColor: 0xDC2626, emissive: 0x400000,
    position: [-0.16, 0.82, 0.28],
    scale: [0.95, 1.1, 0.85], geoRadius: 0.13,
  },
  {
    meshId: "lung_l", organId: "lungs", label: "Lungs", emoji: "🫁",
    color: 0xFFAAC0, hoverColor: 0xF472B6, emissive: 0x3A0018,
    position: [-0.34, 0.74, 0.22],
    scale: [0.9, 1.6, 0.7], geoRadius: 0.14,
  },
  {
    meshId: "lung_r", organId: "lungs", label: "Lungs", emoji: "🫁",
    color: 0xFFAAC0, hoverColor: 0xF472B6, emissive: 0x3A0018,
    position: [0.34, 0.74, 0.22],
    scale: [0.9, 1.6, 0.7], geoRadius: 0.14,
  },
  {
    meshId: "liver", organId: "liver", label: "Liver", emoji: "🫁",
    color: 0xA0522D, hoverColor: 0x78350F, emissive: 0x280E00,
    position: [0.27, 0.5, 0.24],
    scale: [1.4, 0.78, 0.68], geoRadius: 0.15,
  },
  {
    meshId: "stomach", organId: "stomach", label: "Stomach", emoji: "🟢",
    color: 0x4ADE80, hoverColor: 0x16A34A, emissive: 0x0A2010,
    position: [-0.12, 0.44, 0.26],
    scale: [1.05, 0.9, 0.75], geoRadius: 0.13,
  },
  {
    meshId: "kidney_l", organId: "kidneys", label: "Kidneys", emoji: "🫘",
    color: 0xFB923C, hoverColor: 0xEA580C, emissive: 0x3A1200,
    position: [-0.31, 0.32, -0.08],
    scale: [0.72, 1.25, 0.68], geoRadius: 0.1,
  },
  {
    meshId: "kidney_r", organId: "kidneys", label: "Kidneys", emoji: "🫘",
    color: 0xFB923C, hoverColor: 0xEA580C, emissive: 0x3A1200,
    position: [0.31, 0.32, -0.08],
    scale: [0.72, 1.25, 0.68], geoRadius: 0.1,
  },
  {
    meshId: "bones", organId: "bones", label: "Bones", emoji: "🦴",
    color: 0xEDE9D0, hoverColor: 0xD4C99A, emissive: 0x201800,
    position: [0, 0.1, -0.28],
    scale: [1, 3.2, 0.35], geoRadius: 0.12,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  selectedOrganId: string | null;
  onOrganSelect: (organId: string, label: string, emoji: string) => void;
}

export default function AnatomyViewer3D({ selectedOrganId, onOrganSelect }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef    = useRef<number>(0);
  const organMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const hoveredMeshIdRef = useRef<string | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef   = useRef(new THREE.Vector2());
  const selectedOrganIdRef = useRef<string | null>(selectedOrganId);
  const [hoveredLabel, setHoveredLabel] = useState<string>("");

  // Keep ref in sync with prop for use inside event handlers
  useEffect(() => {
    selectedOrganIdRef.current = selectedOrganId;
    updateOrganHighlights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganId]);

  function getMeshMaterial(meshId: string): THREE.MeshStandardMaterial {
    const def = ORGAN_DEFS_3D.find(d => d.meshId === meshId);
    if (!def) return new THREE.MeshStandardMaterial();
    return new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.65,
      metalness: 0.08,
      emissive: new THREE.Color(def.emissive),
      emissiveIntensity: 0.15,
    });
  }

  function updateOrganHighlights() {
    const selId = selectedOrganIdRef.current;
    const hovId = hoveredMeshIdRef.current;

    organMeshesRef.current.forEach((mesh, meshId) => {
      const def = ORGAN_DEFS_3D.find(d => d.meshId === meshId);
      if (!def) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isSelected = selId === def.organId;
      const isHovered = hovId === meshId;

      if (isSelected) {
        mat.color.setHex(def.hoverColor);
        mat.emissiveIntensity = 0.45;
        mat.emissive.setHex(def.hoverColor);
        mesh.scale.setScalar(1.12);
      } else if (isHovered) {
        mat.color.setHex(def.hoverColor);
        mat.emissiveIntensity = 0.28;
        mat.emissive.setHex(def.hoverColor);
        mesh.scale.setScalar(1.06);
      } else {
        mat.color.setHex(def.color);
        mat.emissiveIntensity = 0.15;
        mat.emissive.setHex(def.emissive);
        mesh.scale.set(def.scale[0], def.scale[1], def.scale[2]);
      }
      mat.needsUpdate = true;
    });
  }

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    let stopped = false;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF0F4F8);
    scene.fog = new THREE.Fog(0xF0F4F8, 8, 18);
    sceneRef.current = scene;

    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(0, 0.4, 5.2);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    // ── Lights ────────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8AAEFF, 0.6);
    fillLight.position.set(-3, 1, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xFFE8D0, 0.4);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // ── Body (semi-transparent silhouette) ────────────────────────────────────
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xD4B896,
      roughness: 0.8,
      metalness: 0.0,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const skinMatSolid = new THREE.MeshStandardMaterial({
      color: 0xE2C9A8,
      roughness: 0.75,
      metalness: 0.0,
    });

    type BodyPartSpec = {
      geo: THREE.BufferGeometry;
      mat: THREE.Material;
      pos: [number, number, number];
      rot?: [number, number, number];
      scl?: [number, number, number];
    };

    const bodyParts: BodyPartSpec[] = [
      // Head (solid)
      { geo: new THREE.SphereGeometry(0.38, 32, 32), mat: skinMatSolid, pos: [0, 1.72, 0] },
      // Neck
      { geo: new THREE.CylinderGeometry(0.12, 0.15, 0.22, 16), mat: skinMatSolid, pos: [0, 1.44, 0] },
      // Chest
      { geo: new THREE.CylinderGeometry(0.42, 0.38, 0.72, 18), mat: skinMat, pos: [0, 0.88, 0] },
      // Abdomen
      { geo: new THREE.CylinderGeometry(0.37, 0.33, 0.52, 18), mat: skinMat, pos: [0, 0.37, 0] },
      // Pelvis (flattened sphere-cap)
      { geo: new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat: skinMatSolid, pos: [0, 0.04, 0], rot: [Math.PI, 0, 0] },
      // Left shoulder
      { geo: new THREE.SphereGeometry(0.14, 16, 16), mat: skinMatSolid, pos: [-0.52, 1.16, 0] },
      // Right shoulder
      { geo: new THREE.SphereGeometry(0.14, 16, 16), mat: skinMatSolid, pos: [0.52, 1.16, 0] },
      // Left upper arm
      { geo: new THREE.CylinderGeometry(0.095, 0.085, 0.56, 12), mat: skinMatSolid, pos: [-0.62, 0.77, 0], rot: [0, 0, Math.PI / 12] },
      // Right upper arm
      { geo: new THREE.CylinderGeometry(0.095, 0.085, 0.56, 12), mat: skinMatSolid, pos: [0.62, 0.77, 0], rot: [0, 0, -Math.PI / 12] },
      // Left forearm
      { geo: new THREE.CylinderGeometry(0.075, 0.065, 0.52, 12), mat: skinMatSolid, pos: [-0.7, 0.24, 0], rot: [0, 0, Math.PI / 14] },
      // Right forearm
      { geo: new THREE.CylinderGeometry(0.075, 0.065, 0.52, 12), mat: skinMatSolid, pos: [0.7, 0.24, 0], rot: [0, 0, -Math.PI / 14] },
      // Left hand
      { geo: new THREE.SphereGeometry(0.08, 12, 12), mat: skinMatSolid, pos: [-0.76, -0.06, 0], scl: [1, 0.7, 0.6] },
      // Right hand
      { geo: new THREE.SphereGeometry(0.08, 12, 12), mat: skinMatSolid, pos: [0.76, -0.06, 0], scl: [1, 0.7, 0.6] },
      // Left thigh
      { geo: new THREE.CylinderGeometry(0.16, 0.135, 0.68, 12), mat: skinMatSolid, pos: [-0.22, -0.48, 0] },
      // Right thigh
      { geo: new THREE.CylinderGeometry(0.16, 0.135, 0.68, 12), mat: skinMatSolid, pos: [0.22, -0.48, 0] },
      // Left lower leg
      { geo: new THREE.CylinderGeometry(0.105, 0.085, 0.68, 12), mat: skinMatSolid, pos: [-0.22, -1.12, 0] },
      // Right lower leg
      { geo: new THREE.CylinderGeometry(0.105, 0.085, 0.68, 12), mat: skinMatSolid, pos: [0.22, -1.12, 0] },
      // Left foot
      { geo: new THREE.SphereGeometry(0.09, 12, 8), mat: skinMatSolid, pos: [-0.22, -1.48, 0.06], scl: [0.75, 0.52, 1.4] },
      // Right foot
      { geo: new THREE.SphereGeometry(0.09, 12, 8), mat: skinMatSolid, pos: [0.22, -1.48, 0.06], scl: [0.75, 0.52, 1.4] },
    ];

    bodyParts.forEach(({ geo, mat, pos, rot, scl }) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      if (rot) mesh.rotation.set(...rot);
      if (scl) mesh.scale.set(...scl);
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // ── Organs ────────────────────────────────────────────────────────────────
    ORGAN_DEFS_3D.forEach(def => {
      const geo = new THREE.SphereGeometry(def.geoRadius, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.65,
        metalness: 0.08,
        emissive: new THREE.Color(def.emissive),
        emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...def.position);
      mesh.scale.set(...def.scale);
      mesh.castShadow = true;
      mesh.userData = { meshId: def.meshId, organId: def.organId, label: def.label, emoji: def.emoji };
      scene.add(mesh);
      organMeshesRef.current.set(def.meshId, mesh);
    });

    // Apply initial selection highlight
    updateOrganHighlights();

    // ── OrbitControls ─────────────────────────────────────────────────────────
    let controls: { update: () => void; dispose: () => void } | null = null;

    import("three/examples/jsm/controls/OrbitControls.js").then(({ OrbitControls }) => {
      if (stopped) return;
      const c = new OrbitControls(camera, renderer.domElement);
      c.enableDamping = true;
      c.dampingFactor = 0.06;
      c.minDistance = 2.5;
      c.maxDistance = 9;
      c.target.set(0, 0.3, 0);
      c.maxPolarAngle = Math.PI * 0.88;
      c.update();
      controls = c;
    });

    // ── Interaction ────────────────────────────────────────────────────────────
    function getOrganMeshes(): THREE.Object3D[] {
      return Array.from(organMeshesRef.current.values());
    }

    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(getOrganMeshes());

      const prevHovered = hoveredMeshIdRef.current;
      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        const meshId = mesh.userData.meshId as string;
        hoveredMeshIdRef.current = meshId;
        renderer.domElement.style.cursor = "pointer";
        setHoveredLabel(`${mesh.userData.emoji} ${mesh.userData.label}`);
      } else {
        hoveredMeshIdRef.current = null;
        renderer.domElement.style.cursor = "grab";
        setHoveredLabel("");
      }

      if (prevHovered !== hoveredMeshIdRef.current) {
        updateOrganHighlights();
      }
    }

    function onClick(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(getOrganMeshes());

      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        onOrganSelect(mesh.userData.organId, mesh.userData.label, mesh.userData.emoji);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(getOrganMeshes());
      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        onOrganSelect(mesh.userData.organId, mesh.userData.label, mesh.userData.emoji);
      }
    }

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("touchend", onTouchEnd);
    renderer.domElement.style.cursor = "grab";

    // ── Resize observer ───────────────────────────────────────────────────────
    const resizeObs = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObs.observe(container);

    // ── Animation loop ────────────────────────────────────────────────────────
    function animate() {
      if (stopped) return;
      frameRef.current = requestAnimationFrame(animate);
      controls?.update();
      renderer.render(scene, camera);
    }
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      stopped = true;
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      resizeObs.disconnect();
      controls?.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      organMeshesRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {/* Hovered organ label */}
      {hoveredLabel && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-900/90 text-white text-sm font-semibold px-4 py-2 rounded-full pointer-events-none animate-fade-in shadow-lg">
          {hoveredLabel}
        </div>
      )}

      {/* Interaction hint */}
      <div className="absolute top-3 right-3 text-[10px] text-gray-400 font-medium pointer-events-none">
        Drag to rotate · Scroll to zoom · Click organs
      </div>
    </div>
  );
}
