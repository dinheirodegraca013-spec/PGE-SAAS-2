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
    renderer.setClearColor(0xf8fafc, 1);
    host.replaceChildren(renderer.domElement);
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
      const width = host.clientWidth;
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
      host.replaceChildren();
    };
  }, [setores]);

  if (indisponivel) {
    return (
      <div className="flex min-h-[430px] items-center justify-center rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-600">
        Seu navegador não conseguiu abrir o modo 3D. Os setores continuam disponíveis nos painéis laterais.
      </div>
    );
  }
  return <div ref={hostRef} className="min-h-[430px] w-full overflow-hidden rounded-xl" />;
}

