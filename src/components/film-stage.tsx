/*
  夜の題と場面。クラス名は変えない。
  スワイプの判定はここ。再生の切替とシークは殻がやる。
*/
import { useRef } from "react";
import { SCENES, sceneSpan } from "@/data/score";

export function FilmTitle({ section, onSection }: { section: string; onSection: () => void }) {
  return (
    <header className="topbar">
      <h1 className="song-vert">朱のうなじ</h1>
      <button type="button" className="section-chip" onClick={onSection}>
        {section}
      </button>
    </header>
  );
}

export function FilmStage({
  sceneIndex,
  syncVideo,
  onSwipe,
}: {
  sceneIndex: number;
  syncVideo: (node: HTMLVideoElement | null, sceneStart: number) => void;
  onSwipe: (dx: number, dy: number) => void;
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  return (
    <div
      className="stage"
      aria-hidden="true"
      onPointerDown={(event) => {
        start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      }}
      onPointerUp={(event) => {
        const from = start.current;
        start.current = null;
        if (!from || from.id !== event.pointerId) return;
        const dx = event.clientX - from.x;
        const dy = event.clientY - from.y;
        if (Math.hypot(dx, dy) < 48) return;
        onSwipe(dx, dy);
      }}
    >
      {SCENES.map((scene, index) => {
        const on = index === sceneIndex;
        return (
          <div key={`${scene.t}-${scene.still}`} className={on ? "frame frame-on" : "frame"}>
            <img
              src={scene.still}
              alt=""
              draggable={false}
              className={on ? `media ken-${scene.ken}` : "media"}
              style={on ? { animationDuration: `${sceneSpan(index)}s` } : undefined}
            />
            {scene.video && on ? (
              <video
                key={`${scene.t}-v`}
                ref={(node) => syncVideo(node, scene.t)}
                className={`media ken-${scene.ken}`}
                style={{ animationDuration: `${sceneSpan(index)}s` }}
                src={scene.video}
                poster={scene.still}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : null}
          </div>
        );
      })}
      <div className="vignette" />
      <div className="scrim" />
      <div className="grain" />
      <div className="petals" aria-hidden="true">
        {Array.from({ length: 14 }, (_, n) => (
          <span key={n} className={`petal petal-${n}`} />
        ))}
      </div>
    </div>
  );
}
