export type CardTier = "red" | "orange" | "yellow" | "violet" | "green" | "blue" | "rainbow";

export function getCardTier(pct: number): CardTier {
  if (pct > 50) return "red";
  if (pct > 10) return "orange";
  if (pct > 5) return "yellow";
  if (pct > 1) return "violet";
  if (pct > 0.1) return "blue";
  return "rainbow";
}

export const TIER_LABELS: Record<CardTier, string> = {
  red: "Común", orange: "Poco común", yellow: "Inusual",
  violet: "Rara", green: "Muy rara", blue: "Ultra rara", rainbow: "Legendaria",
};

export const TIER_GRADIENTS: Record<CardTier, string> = {
  red: "linear-gradient(145deg, #450a0a 0%, #7f1d1d 50%, #b91c1c 100%)",
  orange: "linear-gradient(145deg, #431407 0%, #7c2d12 50%, #c2410c 100%)",
  yellow: "linear-gradient(145deg, #422006 0%, #78350f 50%, #b45309 100%)",
  violet: "linear-gradient(145deg, #2e1065 0%, #4c1d95 50%, #7c3aed 100%)",
  green: "linear-gradient(145deg, #052e16 0%, #14532d 50%, #15803d 100%)",
  blue: "linear-gradient(145deg, #0c1a2e 0%, #1e3a5f 50%, #1d4ed8 100%)",
  rainbow: "linear-gradient(145deg, #7f1d1d, #7c2d12, #78350f, #4c1d95, #14532d, #1e3a5f)",
};

export const TIER_ACCENT: Record<CardTier, string> = {
  red: "#ef4444", orange: "#f97316", yellow: "#eab308",
  violet: "#8b5cf6", green: "#22c55e", blue: "#3b82f6", rainbow: "#a855f7",
};

export function calcDiscardValue(card: { hasCase: boolean }): number {
  return 0.5 + (card.hasCase ? 5 : 0);
}

export function fmtD(amount: number): string {
  const [intPart, decPart] = amount.toFixed(5).split(".");
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `D$${intFmt},${decPart}`;
}

export function fmtDStr(s: string): string {
  return fmtD(parseFloat(s));
}

export type CardLike = {
  percentage?: string | null;
  hasCase: boolean;
  powerPoints?: number;
  nombre?: string | null;
  imagenUrl?: string | null;
};

export function CardDisplay({ card, size = "sm" }: { card: CardLike; size?: "sm" | "lg" }) {
  const w = size === "lg" ? 220 : 140;
  const h = size === "lg" ? 308 : 196;
  const labelFont = size === "lg" ? "0.75rem" : "0.48rem";
  const nameFont = size === "lg" ? "1.15rem" : "0.72rem";

  if (card.imagenUrl) {
    const shadow = card.hasCase
      ? `0 0 0 2.5px #FFD700, 0 0 28px rgba(255,215,0,0.55), 0 8px 32px rgba(0,0,0,0.6)`
      : `0 0 0 1.5px rgba(255,255,255,0.18), 0 8px 32px rgba(0,0,0,0.5)`;

    return (
      <div style={{ width: w, height: h, borderRadius: 16, background: "#111", boxShadow: shadow, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: size === "lg" ? 18 : 11, flexShrink: 0, userSelect: "none" }}>
        <img
          src={card.imagenUrl}
          alt={card.nombre ?? ""}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)" }} />
        {card.hasCase && (
          <div style={{ position: "absolute", inset: 3, border: "1.5px solid rgba(255,215,0,0.45)", borderRadius: 13, pointerEvents: "none", zIndex: 2 }} />
        )}
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", alignSelf: "flex-start" }}>
          <span style={{ fontSize: labelFont, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 6 }}>Banco D$</span>
        </div>
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: nameFont, fontWeight: 900, color: "white", textShadow: "0 1px 8px rgba(0,0,0,0.9)", lineHeight: 1.2, wordBreak: "break-word" }}>
            {card.nombre}
          </div>
        </div>
      </div>
    );
  }

  const pct = parseFloat(card.percentage ?? "0");
  const tier = getCardTier(pct);
  const isRainbow = tier === "rainbow";
  const accent = TIER_ACCENT[tier];
  const pctFont = size === "lg" ? "2.2rem" : "1.35rem";
  const symbolFont = size === "lg" ? "0.65rem" : "0.42rem";

  const shadow = card.hasCase
    ? `0 0 0 2.5px #FFD700, 0 0 28px rgba(255,215,0,0.55), 0 8px 32px rgba(0,0,0,0.6)`
    : `0 0 0 1.5px ${accent}55, 0 8px 32px rgba(0,0,0,0.5)`;

  return (
    <div style={{ width: w, height: h, borderRadius: 16, background: TIER_GRADIENTS[tier], boxShadow: shadow, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: size === "lg" ? 18 : 11, flexShrink: 0, userSelect: "none" }}>
      {isRainbow && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(239,68,68,0.35) 0%, rgba(249,115,22,0.35) 17%, rgba(234,179,8,0.35) 33%, rgba(139,92,246,0.35) 50%, rgba(34,197,94,0.35) 67%, rgba(59,130,246,0.35) 83%, rgba(239,68,68,0.35) 100%)", backgroundSize: "200% 200%", animation: "rainbowShift 3s linear infinite" }} />
      )}
      {card.hasCase && (
        <div style={{ position: "absolute", inset: 3, border: "1.5px solid rgba(255,215,0,0.45)", borderRadius: 13, pointerEvents: "none" }} />
      )}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <span style={{ fontSize: labelFont, fontWeight: 800, color: "rgba(255,255,255,0.65)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{TIER_LABELS[tier]}</span>
      </div>
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: symbolFont, color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>porcentaje</div>
        <div style={{ fontSize: pctFont, fontWeight: 900, color: "white", textShadow: `0 0 24px ${accent}`, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {pct.toFixed(2).replace(".", ",")}%
        </div>
      </div>
    </div>
  );
}
