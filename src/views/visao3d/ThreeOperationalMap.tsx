import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type MapSector = {
  id: string;
  nome: string;
  estado: "normal" | "atencao" | "critico" | "sem-dados";
};
type Worker = { id: string; nome: string; ativo: boolean };

const colors: Record<MapSector["estado"], number> = {
  normal: 0x5fb58a,
  atencao: 0xd1b24f,
  critico: 0xd95d68,
  "sem-dados": 0x9aa6b2,
};

function createLabel(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(15, 23, 42, 0.88)";
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
  context.fill();
  context.fillStyle = color;
  context.font = "700 30px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text.slice(0, 24), canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  );
  sprite.scale.set(2.55, 0.64, 1);
  sprite.userData.labelTexture = texture;
  return sprite;
}

export default function ThreeOperationalMap({
  setores,
  trabalhadores,
  resetKey,
}: {
  setores: MapSector[];
  trabalhadores: Worker[];
  resetKey: number;
}) {
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
    renderer.setClearColor(0xf8fafc, 1);
    renderer.shadowMap.enabled = true;
    renderer.domElement.className = "absolute inset-0 h-full w-full";
    host.insertBefore(renderer.domElement, host.firstChild);
    renderer.domElement.setAttribute(
      "aria-label",
      "Mapa operacional 3D da empresa",
    );
    renderer.domElement.setAttribute("role", "img");
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setIndisponivel(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(10, 9, 13);
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
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(new THREE.GridHelper(13, 13, 0xcbd5e1, 0xe2e8f0));

    const groups: THREE.Group[] = [];
    setores.forEach((setor, index) => {
      const group = new THREE.Group();
      const x = ((index % 3) - 1) * 4;
      const z = (Math.floor(index / 3) - 0.5) * 4;
      group.position.set(x, 0, z);
      const material = new THREE.MeshStandardMaterial({
        color: colors[setor.estado],
        roughness: 0.62,
        metalness: 0.05,
        transparent: setor.estado === "sem-dados",
        opacity: setor.estado === "sem-dados" ? 0.45 : 1,
      });
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(3.1, 1.3, 2.5),
        material,
      );
      block.position.y = 0.7;
      block.castShadow = true;
      group.add(block);
      const label = createLabel(
        setor.nome,
        setor.estado === "critico" ? "#fecdd3" : "#e2e8f0",
      );
      if (label) {
        label.position.set(0, 2.05, 0);
        group.add(label);
      }
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(block.geometry),
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.85,
        }),
      );
      edge.position.copy(block.position);
      group.add(edge);
      scene.add(group);
      groups.push(group);
    });

    const people = new THREE.Group();
    people.name = "colaboradores-ativos";
    const activeWorkers = trabalhadores.filter((worker) => worker.ativo);
    activeWorkers.forEach((worker, index) => {
      const sectorIndex = index % Math.max(setores.length - 2, 1);
      const x = ((sectorIndex % 3) - 1) * 4 + (index % 2 ? 0.5 : -0.5);
      // Posiciona o colaborador sobre o setor, como no protótipo 3D de referência.
      const z =
        (Math.floor(sectorIndex / 3) - 0.5) * 4 + (index % 2 ? 0.45 : -0.45);
      const person = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 0.75, 12),
        new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.65 }),
      );
      body.position.y = 0.42;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 14, 12),
        new THREE.MeshStandardMaterial({ color: 0xf0c9a0, roughness: 0.8 }),
      );
      head.position.y = 0.98;
      person.add(body, head);
      person.position.set(x, 1.35, z);
      person.scale.setScalar(0.9);
      person.userData.workerId = worker.id;
      person.userData.workerName = worker.nome;
      people.add(person);
    });
    scene.add(people);

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
      people.position.y = Math.sin(Date.now() * 0.0015) * 0.025;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Sprite) {
          const material = object.material as THREE.SpriteMaterial;
          material.map?.dispose();
        }
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments
        ) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        handleContextLost,
      );
      renderer.domElement.remove();
    };
  }, [resetKey, setores, trabalhadores]);

  if (indisponivel) {
    return (
      <div
        role="region"
        aria-label="Mapa operacional em modo compatível"
        className="min-h-[430px] bg-slate-50 p-5"
      >
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          O modo 3D não está disponível neste navegador. Exibindo o mapa
          operacional em modo compatível.
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {setores.map((setor) => (
            <div
              key={setor.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${
                    setor.estado === "critico"
                      ? "bg-rose-500"
                      : setor.estado === "atencao"
                        ? "bg-amber-500"
                        : setor.estado === "sem-dados"
                          ? "bg-slate-400"
                          : "bg-emerald-500"
                  }`}
                />
                {setor.nome}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {setor.estado === "sem-dados" ? "Sem dados" : setor.estado}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Colaboradores ativos
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {trabalhadores
              .filter((worker) => worker.ativo)
              .map((worker) => (
                <span
                  key={worker.id}
                  className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800"
                >
                  {worker.nome}
                </span>
              ))}
            {!trabalhadores.some((worker) => worker.ativo) && (
              <span className="text-xs text-slate-500">
                Nenhum colaborador ativo cadastrado.
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      ref={hostRef}
      role="region"
      aria-label="Mapa operacional 3D"
      className="relative h-full w-full overflow-hidden bg-slate-50"
    />
  );
}

