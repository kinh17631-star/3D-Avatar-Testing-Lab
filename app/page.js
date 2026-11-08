
"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

function AvatarModel({ url, motionMode, onInspect }) {
  const { scene, animations } = useGLTF(url);

  const model = useMemo(() => {
    const cloned = clone(scene);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDimension;

    cloned.scale.setScalar(scale);
    cloned.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );

    return cloned;
  }, [scene]);

  const bones = useMemo(() => {
    const result = [];

    model.traverse((object) => {
      if (object.isBone) {
        result.push({
          bone: object,
          name: object.name,
          initial: {
            x: object.rotation.x,
            y: object.rotation.y,
            z: object.rotation.z
          }
        });
      }
    });

    return result;
  }, [model]);

  useEffect(() => {
    let meshCount = 0;
    let skinnedMeshCount = 0;
    let morphTargetCount = 0;
    const materials = new Set();
    const textures = new Set();

    model.traverse((object) => {
      if (object.isMesh) {
        meshCount++;
      }

      if (object.isSkinnedMesh) {
        skinnedMeshCount++;
      }

      if (object.morphTargetDictionary) {
        morphTargetCount += Object.keys(
          object.morphTargetDictionary
        ).length;
      }

      const materialList = Array.isArray(object.material)
        ? object.material
        : object.material
          ? [object.material]
          : [];

      materialList.forEach((material) => {
        materials.add(material);

        Object.values(material).forEach((value) => {
          if (value && value.isTexture) {
            textures.add(value);
          }
        });
      });
    });

    const boneNames = bones.map((item) => item.name);

    const hasHead = boneNames.some((name) =>
      /head|neck/i.test(name)
    );

    const hasArms = boneNames.some((name) =>
      /arm|shoulder/i.test(name)
    );

    const hasJaw = boneNames.some((name) =>
      /jaw/i.test(name)
    );

    const hasBlink = bones.some((item) =>
      /eyelid|eye.?lid/i.test(item.name)
    );

    onInspect({
      bones: bones.length,
      boneNames,
      meshes: meshCount,
      skinnedMeshes: skinnedMeshCount,
      materials: materials.size,
      textures: textures.size,
      morphTargets: morphTargetCount,
      animations: animations.length,
      hasHead,
      hasArms,
      hasJaw,
      hasBlink
    });
  }, [model, bones, animations, onInspect]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    bones.forEach(({ bone, name, initial }) => {
      bone.rotation.set(initial.x, initial.y, initial.z);

      if (!motionMode) return;

      if (
        motionMode === "head" &&
        /head|neck/i.test(name)
      ) {
        bone.rotation.y =
          initial.y + Math.sin(time * 1.5) * 0.3;
      }

      if (
        motionMode === "arms" &&
        /upperarm|lowerarm|shoulder|arm/i.test(name)
      ) {
        bone.rotation.x =
          initial.x + Math.sin(time * 2) * 0.3;
      }

      if (
        motionMode === "body" &&
        /spine|pelvis|hips/i.test(name)
      ) {
        bone.rotation.y =
          initial.y + Math.sin(time * 1.5) * 0.15;
      }
    });
  });

  return <primitive object={model} />;
}

function Viewer({ url, motionMode, onInspect }) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 4], fov: 40 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#111827"]} />

      <ambientLight intensity={1.5} />

      <directionalLight
        position={[4, 6, 5]}
        intensity={2}
      />

      <directionalLight
        position={[-4, 3, -3]}
        intensity={1}
      />

      <React.Suspense fallback={null}>
        <AvatarModel
          url={url}
          motionMode={motionMode}
          onInspect={onInspect}
        />
      </React.Suspense>

      <OrbitControls
        enableDamping
        minDistance={1}
        maxDistance={10}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}

import React from "react";

export default function Home() {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarName, setAvatarName] = useState("");
  const [motionMode, setMotionMode] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".glb")) {
      setError("Please select a GLB file.");
      return;
    }

    if (avatarUrl) {
      URL.revokeObjectURL(avatarUrl);
    }

    setError("");
    setStats(null);
    setMotionMode(null);
    setAvatarName(file.name);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleInspect = (data) => {
    setStats(data);
  };

  return (
    <main className="lab">
      <header className="header">
        <div className="brand">Your 3D Avatar Testing Lab</div>
        <label className="uploadButton">
          Upload GLB
          <input
            type="file"
            accept=".glb"
            onChange={handleUpload}
            hidden
          />
        </label>
      </header>

      <section className="workspace">
        <div className="viewer">
          {avatarUrl ? (
            <Viewer
              url={avatarUrl}
              motionMode={motionMode}
              onInspect={handleInspect}
            />
          ) : (
            <div className="empty">
              <div className="emptyIcon">3D</div>
              <h2>Your avatar will appear here</h2>
              <p>Upload a GLB character to begin testing.</p>
            </div>
          )}
        </div>

        <aside className="panel">
          <h2>Testing Controls</h2>

          <div className="fileName">
            {avatarName || "No avatar selected"}
          </div>

          <h3>Body Movement</h3>

          <div className="controls">
            <button
              disabled={!stats?.hasHead}
              className={motionMode === "head" ? "active" : ""}
              onClick={() =>
                setMotionMode(
                  motionMode === "head" ? null : "head"
                )
              }
            >
              Head Movement
            </button>

            <button
              disabled={!stats?.hasArms}
              className={motionMode === "arms" ? "active" : ""}
              onClick={() =>
                setMotionMode(
                  motionMode === "arms" ? null : "arms"
                )
              }
            >
              Arm Movement
            </button>

            <button
              disabled={!stats}
              className={motionMode === "body" ? "active" : ""}
              onClick={() =>
                setMotionMode(
                  motionMode === "body" ? null : "body"
                )
              }
            >
              Body Movement
            </button>

            <button
              disabled={!motionMode}
              className="stop"
              onClick={() => setMotionMode(null)}
            >
              Stop Movement
            </button>
          </div>

          <h3>Model Inspection</h3>

          {!stats ? (
            <p className="muted">
              Upload a character to inspect its data.
            </p>
          ) : (
            <div className="stats">
              <div><span>Bones</span><b>{stats.bones}</b></div>
              <div><span>Meshes</span><b>{stats.meshes}</b></div>
              <div><span>Skinned Meshes</span><b>{stats.skinnedMeshes}</b></div>
              <div><span>Materials</span><b>{stats.materials}</b></div>
              <div><span>Textures</span><b>{stats.textures}</b></div>
              <div><span>Animations</span><b>{stats.animations}</b></div>
              <div><span>Morph Targets</span><b>{stats.morphTargets}</b></div>
            </div>
          )}

          <h3>Feature Compatibility</h3>

          {stats && (
            <div className="compatibility">
              <div>
                <span>Head bones</span>
                <b>{stats.hasHead ? "Detected" : "Not detected"}</b>
              </div>
              <div>
                <span>Arm bones</span>
                <b>{stats.hasArms ? "Detected" : "Not detected"}</b>
              </div>
              <div>
                <span>Facial morph targets</span>
                <b>{stats.morphTargets > 0 ? "Available" : "Missing"}</b>
              </div>
              <div>
                <span>Animations</span>
                <b>{stats.animations > 0 ? "Available" : "Missing"}</b>
              </div>
              <div>
                <span>Jaw bone</span>
                <b>{stats.hasJaw ? "Detected" : "Not detected"}</b>
              </div>
              <div>
                <span>Eyelid bones</span>
                <b>{stats.hasBlink ? "Detected" : "Not detected"}</b>
              </div>
            </div>
          )}

          {stats && (
            <details className="boneList">
              <summary>View all detected bones ({stats.bones})</summary>
              <div className="boneNames">
                {stats.boneNames.map((name, index) => (
                  <div key={`${name}-${index}`}>{name}</div>
                ))}
              </div>
            </details>
          )}

          {error && <p className="error">{error}</p>}
        </aside>
      </section>

      <style jsx>{`
        .lab {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top left, #202044 0, transparent 35%),
            #080b14;
        }

        .header {
          max-width: 1500px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .uploadButton {
          background: #7c3aed;
          color: white;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .workspace {
          max-width: 1500px;
          margin: auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 20px;
        }

        .viewer {
          height: 680px;
          min-width: 0;
          overflow: hidden;
          border: 1px solid #293044;
          border-radius: 18px;
          background: #111827;
        }

        .empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
          color: #cbd5e1;
        }

        .emptyIcon {
          width: 70px;
          height: 70px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          background: #252344;
          color: #c4b5fd;
          font-size: 25px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .empty h2 {
          font-size: 20px;
          margin-bottom: 8px;
        }

        .empty p,
        .muted {
          color: #94a3b8;
          font-size: 13px;
        }

        .panel {
          padding: 22px;
          border: 1px solid #293044;
          border-radius: 18px;
          background: #111827;
          min-width: 0;
        }

        .panel h2 {
          font-size: 19px;
          margin-bottom: 12px;
        }

        .panel h3 {
          font-size: 13px;
          color: #c4b5fd;
          margin: 25px 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .fileName {
          font-size: 12px;
          color: #94a3b8;
          overflow-wrap: anywhere;
        }

        .controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .controls button {
          border: 1px solid #343b50;
          border-radius: 9px;
          background: #1d2638;
          color: white;
          padding: 12px 8px;
          font-size: 12px;
        }

        .controls button.active {
          background: #6d28d9;
          border-color: #8b5cf6;
        }

        .controls button.stop {
          background: #351e2b;
          border-color: #71334b;
        }

        .controls button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .stats,
        .compatibility {
          display: grid;
          gap: 11px;
        }

        .stats div,
        .compatibility div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
          color: #aab4c7;
        }

        .stats b {
          color: white;
        }

        .compatibility b {
          color: #c4b5fd;
          text-align: right;
        }

        .boneList {
          margin-top: 20px;
          color: #c4b5fd;
          font-size: 12px;
        }

        .boneList summary {
          cursor: pointer;
          padding: 10px 0;
        }

        .boneNames {
          max-height: 180px;
          overflow-y: auto;
          padding: 10px;
          border-radius: 8px;
          background: #0b1220;
          color: #cbd5e1;
          line-height: 1.9;
          overflow-wrap: anywhere;
        }

        .error {
          color: #fca5a5;
          font-size: 12px;
          margin-top: 15px;
        }

        @media (max-width: 900px) {
          .workspace {
            grid-template-columns: 1fr;
          }

          .viewer {
            height: 520px;
          }
        }

        @media (max-width: 600px) {
          .lab {
            padding: 14px;
          }

          .brand {
            font-size: 16px;
          }

          .uploadButton {
            padding: 10px 12px;
            font-size: 12px;
          }

          .viewer {
            height: 430px;
          }

          .panel {
            padding: 17px;
          }
        }
      `}</style>
    </main>
  );
}
