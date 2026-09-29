"use client";

import { useEffect, useRef, useState } from "react";
import { img } from "@/lib/tmdb";

/** Image qui apparaît en fondu une fois chargée, et disparaît proprement si elle échoue. */
export function FadeImg({ src, alt, eager, className }: { src: string; alt: string; eager?: boolean; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth) setState("loaded");
  }, [src]);
  if (state === "error") return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={[className, state === "loaded" ? "loaded" : ""].filter(Boolean).join(" ")}
      onLoad={() => setState("loaded")}
      onError={() => setState("error")}
    />
  );
}

export function Poster({
  path,
  title,
  size = "w342",
  eager,
  owned,
  children,
}: {
  path?: string | null;
  title: string;
  size?: "w185" | "w342" | "w500";
  eager?: boolean;
  /** libellé de la languette « possédé en physique » (ex. 4K UHD) */
  owned?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className={`poster${owned ? " owned" : ""}`}>
      {path ? <FadeImg src={img(path, size)} alt={`Affiche de ${title}`} eager={eager} /> : <div className="noimg">{title}</div>}
      {owned ? (
        <span className="own-tab" title={`Dans ta collection : ${owned}`}>
          {owned}
        </span>
      ) : null}
      {children}
    </div>
  );
}
