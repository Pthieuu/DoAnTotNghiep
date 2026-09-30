"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRM, VRMExpressionPresetName, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

const stateExpression: Record<AvatarState, VRMExpressionPresetName> = {
  idle: "neutral",
  listening: "relaxed",
  thinking: "surprised",
  speaking: "neutral",
};

type Props = {
  state: AvatarState;
  className?: string;
  onReady?: (expressions: string[]) => void;
  horizontalOffset?: number;
};

export default function VrmAvatar({ state, className, onReady, horizontalOffset = 0 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    let vrm: VRM | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let fitCamera: (() => void) | null = null;
    const bodyBones: Record<string, THREE.Object3D> = {};
    const bodyRest: Record<string, THREE.Quaternion> = {};
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#edf3fb");
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x71809a, 2.2));
    const key = new THREE.DirectionalLight(0xffedd8, 2.6);
    key.position.set(-2.5, 4, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fbaff, 1.2);
    fill.position.set(3, 2, -2);
    scene.add(fill);
    const clock = new THREE.Clock();

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      host.appendChild(renderer.domElement);
    } catch {
      setTimeout(() => {
        if (!disposed) {
          setError("Trình duyệt không thể khởi tạo WebGL. Hãy bật tăng tốc phần cứng hoặc thử trình duyệt khác.");
          setStatus("error");
        }
      }, 0);
      return;
    }

    const resize = () => {
      if (!renderer) return;
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fitCamera?.();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load("/models/Hiro.vrm", (gltf) => {
      if (disposed) {
        VRMUtils.deepDispose(gltf.scene);
        return;
      }
      vrm = gltf.userData.vrm as VRM;
      const humanoid = vrm.humanoid;
      const boneNames = [
        "leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm", "leftHand", "rightHand",
        "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg", "leftFoot", "rightFoot"
      ] as const;
      for (const name of boneNames) {
        const bone = humanoid?.getNormalizedBoneNode(name);
        if (bone) {
          bodyBones[name] = bone;
          bodyRest[name] = bone.quaternion.clone();
        }
      }
      scene.add(vrm.scene);
      VRMUtils.rotateVRM0(vrm);

      const applyBodyPose = (time: number, activeState: AvatarState) => {
        // Tăng biên độ để cử động rõ rệt hơn
        const amplitude = activeState === "speaking" ? 0.6 : activeState === "listening" ? 0.3 : 0.15;
        const wave = Math.sin(time * (activeState === "thinking" ? 1.15 : 1.8));
        const pose = (name: string, base: [number, number, number], motion: [number, number, number]) => {
          const bone = bodyBones[name];
          const rest = bodyRest[name];
          if (!bone || !rest) return;
          const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            base[0] + motion[0] * wave * amplitude,
            base[1] + motion[1] * wave * amplitude,
            base[2] + motion[2] * wave * amplitude,
          ));
          bone.quaternion.copy(rest).multiply(offset);
        };
        // Arms (Tăng biên độ cử động tay)
        pose("leftUpperArm", [0, 0, -0.85], [0.2, 0.4, 0.3]);
        pose("rightUpperArm", [0, 0, 0.85], [0.2, -0.4, -0.3]);
        pose("leftLowerArm", [0.12, 0, 0], [0.4, 0.2, 0.3]);
        pose("rightLowerArm", [0.12, 0, 0], [0.4, -0.2, -0.3]);
        pose("leftHand", [0, 0, 0], [0.2, 0.1, 0.2]);
        pose("rightHand", [0, 0, 0], [0.2, -0.1, -0.2]);
        // Legs (Tăng biên độ nhún nhảy chân)
        pose("leftUpperLeg", [0, 0, -0.05], [0.1, 0.1, 0]);
        pose("rightUpperLeg", [0, 0, 0.05], [-0.1, 0.1, 0]);
        pose("leftLowerLeg", [0.05, 0, 0], [0.15, 0, 0]);
        pose("rightLowerLeg", [0.05, 0, 0], [0.15, 0, 0]);
      };

      // First apply the relaxed pose, then measure the skinned geometry in world
      // space. Use the actual model bounds and aspect ratio to center and fit a full body view.
      applyBodyPose(0, "idle");
      vrm.update(0);
      vrm.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(vrm.scene, true);
      const center = bounds.getCenter(new THREE.Vector3());
      const head = humanoid?.getNormalizedBoneNode("head");
      const top = bounds.isEmpty() ? 1.9 : bounds.max.y;
      // Use bounds.min.y to frame the entire body down to the feet
      const bottom = bounds.min.y;
      const frameHeight = Math.max(top - bottom, 0.85);
      const frameWidth = bounds.isEmpty() ? 0.9 : bounds.max.x - bounds.min.x;
      const target = new THREE.Vector3(center.x, (top + bottom) / 2, center.z);
      fitCamera = () => {
        const requiredHeight = Math.max(frameHeight, frameWidth / Math.max(camera.aspect, 0.55));
        const distance = requiredHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.08;
        // Hiro's renderable upper body sits to the right of its full-body bounds
        // center (the arm bind pose skews that center). Bias the camera target using
        // a responsive fraction of its horizontal field of view.
        const targetWithOffset = target.clone();
        const horizontalHalfView = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        targetWithOffset.x += horizontalOffset * distance * horizontalHalfView;
        camera.position.set(targetWithOffset.x, targetWithOffset.y, targetWithOffset.z + distance);
        camera.lookAt(targetWithOffset);
      };
      fitCamera();
      const expressions = Object.keys(vrm.expressionManager?.expressionMap ?? {});
      onReady?.(expressions);
      setStatus("ready");

      const animate = () => {
        if (disposed || !renderer || !vrm) return;
        frame = requestAnimationFrame(animate);
        const delta = Math.min(clock.getDelta(), 0.05);
        const time = clock.elapsedTime;
        const activeState = stateRef.current;
        const manager = vrm.expressionManager;
        if (manager) {
          for (const name of Object.keys(manager.expressionMap)) manager.setValue(name, 0);
          const expression = stateExpression[activeState];
          if (manager.getExpression(expression)) manager.setValue(expression, activeState === "idle" || activeState === "speaking" ? 1 : 0.38);
          const blinkPhase = time % 4.6;
          if (manager.getExpression("blink")) manager.setValue("blink", blinkPhase > 4.38 ? Math.sin(((blinkPhase - 4.38) / 0.22) * Math.PI) : 0);
          if (manager.getExpression("aa")) manager.setValue("aa", activeState === "speaking" ? 0.22 + 0.16 * (0.5 + 0.5 * Math.sin(time * 9)) : 0);
        }
        if (head) {
          const targetX = mouseRef.current.y * 0.4 + 0.018 * Math.sin(time * 0.9);
          const targetY = -mouseRef.current.x * 0.5 + 0.035 * Math.sin(time * 0.65) + (activeState === "thinking" ? 0.08 : 0);
          
          head.rotation.x += (targetX - head.rotation.x) * 0.1;
          head.rotation.y += (targetY - head.rotation.y) * 0.1;
        }
        applyBodyPose(time, activeState);
        vrm.scene.position.y = 0.012 * Math.sin(time * 1.15);
        vrm.update(delta);
        renderer.render(scene, camera);
      };
      animate();
    }, undefined, (cause) => {
      if (disposed) return;
      console.error("Failed to load Hiro.vrm", cause);
      setError("Không tải được /models/Hiro.vrm. Hãy kiểm tra file có ở public/models/Hiro.vrm và thử tải lại trang.");
      setStatus("error");
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (vrm) {
        scene.remove(vrm.scene);
        VRMUtils.deepDispose(vrm.scene);
      }
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [horizontalOffset, onReady]);

  return <div className={`relative h-full min-h-[340px] w-full overflow-hidden rounded-2xl ${className ?? ""}`}>
    <div ref={hostRef} className="absolute inset-0" />
    {status !== "ready" && <div role={status === "error" ? "alert" : "status"} className={`absolute inset-0 z-10 flex items-center justify-center p-6 text-center ${status === "error" ? "bg-red-50 text-red-800" : "bg-[#edf3fb]/90 text-slate-700"}`}>
      {status === "loading" ? <div><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /><p className="font-medium">Đang tải nhân vật Hiro…</p></div> : <p className="max-w-sm text-sm">{error}</p>}
    </div>}
  </div>;
}
