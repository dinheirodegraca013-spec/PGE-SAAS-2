import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type MapSector = {
  id: string;
  nome: string;
  estado: "normal" | "atencao" | "critico" | "sem-dados";
};

const colors: Record<MapSector["estado"], number> = {
  normal: 0x5fb58a,
  atencao: 0xd1b24f,
  critico: 0xd95d68,
  "sem-dados": 0x9aa6b2,
};
const cssColors: Record<MapSector["estado"], string> = {
  normal: "#5fb58a",
  atencao: "#d1b24f",
  critico: "#d95d68",
  "sem-dados": "#9aa6b2",
};

export default function ThreeOperationalMap({ setores }: { setores: MapSector[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setIndisponivel(true);
      return;
    }
    setIndisponivel(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "absolute inset-0 h-full w-full";
    host.insertBefore(renderer.domElement, host.firstChild);
    renderer.domElement.setAttribute("aria-label", "Mapa operacional 3D da empresa");
    renderer.domElement.setAttribute("role", "img");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(9, 9, 12);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(5, 12, 8);
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.25, 9),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 }),
    );
    floor.position.y = -0.2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(13, 13, 0xcbd5e1, 0xe2e8f0));

    const groups: THREE.Group[] = [];
    setores.forEach((setor, index) => {
      const group = new THREE.Group();
      const x = (index % 3 - 1) * 4;
      const z = (Math.floor(index / 3) - 0.5) * 4;
      group.position.set(x, 0, z);
      const material = new THREE.MeshStandardMaterial({
        color: colors[setor.estado],
        roughness: 0.62,
        metalness: 0.05,
        transparent: setor.estado === "sem-dados",
        opacity: setor.estado === "sem-dados" ? 0.45 : 1,
      });
      const block = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.3, 2.5), material);
      block.position.y = 0.7;
      block.castShadow = true;
      group.add(block);
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(block.geometry),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
      );
      edge.position.copy(block.position);
      group.add(edge);
      scene.add(group);
      groups.push(group);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 22;
    controls.target.set(0, 0.4, 0);

    const resize = () => {
      const width = host.clientWidth || 640;
      const height = Math.max(host.clientHeight, 420);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      groups.forEach((group, index) => {
        group.rotation.y = Math.sin(Date.now() * 0.00035 + index) * 0.025;
      });
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [setores]);

  if (indisponivel) {
    return (
      <div className="flex min-h-[430px] items-center justify-center rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-600">
        Seu navegador não conseguiu abrir o modo 3D. Os setores continuam disponíveis nos painéis laterais.
      </div>
    );
  }
  return (
    <div ref={hostRef} role="region" aria-label="Mapa operacional 3D" className="relative h-[56vh] min-h-[330px] max-h-[520px] w-full overflow-hidden rounded-xl bg-slate-50 sm:h-[430px] sm:max-h-none">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-300/80">
        <div
          className="relative grid w-[88%] max-w-[620px] grid-cols-2 gap-2 rounded-2xl border border-slate-300/70 p-3 [perspective:900px] [transform:rotateX(38deg)_rotateZ(-2deg)] sm:grid-cols-3 sm:gap-3 sm:p-4 sm:[transform:rotateX(52deg)_rotateZ(-3deg)_skewX(-3deg)]"
          style={{
            backgroundImage: "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {setores.map((setor) => (
            <div
              key={setor.id}
              className="flex min-h-[76px] flex-col items-start justify-end gap-1 rounded-lg border-2 border-white/80 p-2 text-[10px] font-black text-white shadow-[0_18px_20px_-12px_rgba(15,23,42,0.55)] sm:min-h-[92px] sm:flex-row sm:items-end sm:justify-between sm:p-3 sm:text-xs"
              style={{ backgroundColor: cssColors[setor.estado], transform: "translateZ(18px)" }}
            >
              <span className="rounded bg-black/20 px-2 py-1">{setor.nome}</span>
              <span className="rounded-full bg-white/80 px-2 py-1 text-[8px] uppercase tracking-wide text-slate-700 sm:text-[9px]">
                {setor.estado === "sem-dados" ? "sem dados" : setor.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-white/80 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
        Modo 3D ativo · arraste para girar · roda para aproximar
      </div>
    </div>
  );
}

