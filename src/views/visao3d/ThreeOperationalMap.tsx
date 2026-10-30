import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type MapSector = {
  id: string;
  nome: string;
  estado: "normal" | "atencao" | "critico" | "sem-dados";
};
type Worker = { id: string; nome: string; ativo: boolean };

// Geometria do modelo HTML aprovado, reduzida para a escala do mapa.
function addWorkshopFurniture(group: THREE.Group, sectorId: string) {
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const wood = material(0x8a5a2b),
    gray = material(0x555e66),
    white = material(0xf2f2f2);
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  if (sectorId === "corte") {
    box(2.4, 0.7, 1.2, gray, -0.6, 0.65, -1);
    const blade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20),
      material(0xcccccc),
    );
    blade.rotation.x = Math.PI / 2;
    blade.position.set(-0.6, 1.15, -1);
    group.add(blade);
    box(1.6, 0.25, 0.5, wood, 1.7, 0.4, -1.4);
  } else if (sectorId === "montagem") {
    box(2.6, 0.5, 1.2, wood, -0.4, 0.5, -1);
    box(1, 1.1, 0.7, material(0xb98a5a), 1.6, 0.7, -1.2);
  } else if (sectorId === "acabamento") {
    const booth = new THREE.MeshStandardMaterial({
      color: 0xcdb6ee,
      roughness: 0.7,
      transparent: true,
      opacity: 0.4,
    });
    box(2, 1.6, 1.5, booth, 0, 0.95, -1);
    box(0.3, 0.3, 0.3, gray, 0.5, 0.6, -1);
  } else if (sectorId === "instalacao") {
    box(2.6, 1, 1.2, white, -0.2, 0.8, -1);
    box(0.9, 0.7, 1.2, white, 1.5, 0.65, -1);
    [-1.2, 0.9].forEach((x) =>
      [-1.55, -0.45].forEach((z) => {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14),
          material(0x222222),
        );
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.45, z);
        group.add(wheel);
      }),
    );
  } else if (sectorId === "estoque") {
    [-1.2, 0.6].forEach((x) => {
      box(1.5, 1.6, 0.5, gray, x, 0.95, -1.7);
      [0.5, 1, 1.5].forEach((y) => box(0.5, 0.3, 0.4, wood, x, y + 0.2, -1.65));
    });
  } else if (sectorId === "financeiro") {
    box(2, 0.4, 1, wood, -0.4, 0.5, -1.3);
    box(0.7, 0.45, 0.05, material(0x222a30), -0.4, 1, -1.5);
    box(0.6, 0.5, 0.6, material(0x333c44), -0.4, 0.5, -0.4);
  }
}

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
  onSectorSelect,
}: {
  setores: MapSector[];
  trabalhadores: Worker[];
  resetKey: number;
  onSectorSelect?: (sectorId: string) => void;
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
    camera.position.set(2, 11, 15);
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
      group.userData.sectorId = setor.id;
      const roomColor = [
        0xc98a4b, 0x6f9bd1, 0xa77bd1, 0x5fb58a, 0xd1b24f, 0x7a8794,
      ][index % 6];
      const material = new THREE.MeshStandardMaterial({
        color: roomColor,
        roughness: 0.62,
        metalness: 0.05,
      });
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(3.3, 0.165, 2.75),
        material,
      );
      block.position.y = 0.0275;
      block.castShadow = true;
      group.add(block);
      const furniture = new THREE.Group();
      furniture.scale.setScalar(0.55);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1.4, 0.15),
        new THREE.MeshStandardMaterial({
          color: roomColor,
          transparent: true,
          opacity: 0.35,
          roughness: 0.7,
        }),
      );
      wall.position.set(0, 0.9, -2.5);
      furniture.add(wall);
      addWorkshopFurniture(furniture, setor.id);
      group.add(furniture);
      if (setor.estado === "critico" || setor.estado === "atencao") {
        const marker = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.45, 4),
          new THREE.MeshStandardMaterial({
            color: setor.estado === "critico" ? 0xe0281b : 0xe0a21b,
          }),
        );
        marker.rotation.x = Math.PI;
        marker.position.set(0, 1.5, -1);
        group.add(marker);
      }
      const label = createLabel(
        setor.nome,
        setor.estado === "critico" ? "#fecdd3" : "#e2e8f0",
      );
      if (label) {
        label.position.set(0, 1.15, -0.95);
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
      const z = (Math.floor(sectorIndex / 3) - 0.5) * 4 + 0.85;
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
      person.position.set(x, 0.11, z);
      person.scale.setScalar(0.65);
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
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };
    const updatePointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    };
    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!onSectorSelect) return;
      const moved = Math.hypot(
        event.clientX - pointerDown.x,
        event.clientY - pointerDown.y,
      );
      if (moved > 8) return;
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(groups, true)[0];
      let current: THREE.Object3D | null | undefined = hit?.object;
      while (current && !current.userData.sectorId) current = current.parent;
      const sectorId = current?.userData.sectorId as string | undefined;
      if (sectorId) onSectorSelect(sectorId);
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.style.cursor = "pointer";

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
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.remove();
    };
  }, [onSectorSelect, resetKey, setores, trabalhadores]);

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

