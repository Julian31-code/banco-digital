import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { ArrowUpDown, Send, Trash2, ArrowLeftRight, CheckCircle2, CheckSquare, Globe, Clock, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardListing = { id: number; price: string; status: string };

type Card = {
  id: number;
  userId: number;
  percentage: string | null;
  hasCase: boolean;
  powerPoints: number;
  createdAt: string;
  nombre: string | null;
  imagenUrl: string | null;
  listing?: CardListing | null;
};

type OfferFull = {
  id: number;
  cardId: number;
  amount: string;
  status: string;
  counterAmount: string | null;
  createdAt: string;
  card: { id: number; percentage: string | null; hasCase: boolean; powerPoints: number; nombre?: string | null; imagenUrl?: string | null };
  fromUser?: { id: number; username: string };
  toUser?: { id: number; username: string };
};

// ─── Card utilities ───────────────────────────────────────────────────────────

type CardTier = "red" | "orange" | "yellow" | "violet" | "green" | "blue" | "rainbow";

function getCardTier(pct: number): CardTier {
  if (pct > 50) return "red";
  if (pct > 10) return "orange";
  if (pct > 5) return "yellow";
  if (pct > 1) return "violet";
  if (pct > 0.1) return "blue";
  return "rainbow";
}

const TIER_LABELS: Record<CardTier, string> = {
  red: "Común", orange: "Poco común", yellow: "Inusual",
  violet: "Rara", green: "Muy rara", blue: "Ultra rara", rainbow: "Legendaria",
};

const TIER_GRADIENTS: Record<CardTier, string> = {
  red: "linear-gradient(145deg, #450a0a 0%, #7f1d1d 50%, #b91c1c 100%)",
  orange: "linear-gradient(145deg, #431407 0%, #7c2d12 50%, #c2410c 100%)",
  yellow: "linear-gradient(145deg, #422006 0%, #78350f 50%, #b45309 100%)",
  violet: "linear-gradient(145deg, #2e1065 0%, #4c1d95 50%, #7c3aed 100%)",
  green: "linear-gradient(145deg, #052e16 0%, #14532d 50%, #15803d 100%)",
  blue: "linear-gradient(145deg, #0c1a2e 0%, #1e3a5f 50%, #1d4ed8 100%)",
  rainbow: "linear-gradient(145deg, #7f1d1d, #7c2d12, #78350f, #4c1d95, #14532d, #1e3a5f)",
};

const TIER_ACCENT: Record<CardTier, string> = {
  red: "#ef4444", orange: "#f97316", yellow: "#eab308",
  violet: "#8b5cf6", green: "#22c55e", blue: "#3b82f6", rainbow: "#a855f7",
};

function calcDiscardValue(card: { hasCase: boolean }): number {
  return 0.5 + (card.hasCase ? 5 : 0);
}

function fmtD(amount: number): string {
  const [intPart, decPart] = amount.toFixed(5).split(".");
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `D$${intFmt},${decPart}`;
}
function fmtDStr(s: string): string {
  return fmtD(parseFloat(s));
}

// ─── CardDisplay ──────────────────────────────────────────────────────────────

function CardDisplay({ card, size = "sm" }: { card: { percentage?: string | null; hasCase: boolean; powerPoints?: number; nombre?: string | null; imagenUrl?: string | null }; size?: "sm" | "lg" }) {
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
        <img src={card.imagenUrl} alt={card.nombre ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)" }} />
        {card.hasCase && <div style={{ position: "absolute", inset: 3, border: "1.5px solid rgba(255,215,0,0.45)", borderRadius: 13, pointerEvents: "none", zIndex: 2 }} />}
        <div style={{ position: "relative", zIndex: 3, alignSelf: "flex-start" }}>
          <span style={{ fontSize: labelFont, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 6 }}>Banco D$</span>
        </div>
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: nameFont, fontWeight: 900, color: "white", textShadow: "0 1px 8px rgba(0,0,0,0.9)", lineHeight: 1.2, wordBreak: "break-word" }}>{card.nombre}</div>
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

// ─── CardModal ────────────────────────────────────────────────────────────────

function CardModal({
  card: initialCard,
  cases: initialCases,
  hasPendingOffer,
  onClose,
  onUpdate,
  onDiscard,
}: {
  card: Card;
  cases: number;
  hasPendingOffer: boolean;
  onClose: () => void;
  onUpdate: (updatedCard: Card, newCases: number) => void;
  onDiscard: (casesReturned: number) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [card, setCard] = useState(initialCard);
  const [cases, setCases] = useState(initialCases);
  const [loading, setLoading] = useState<string | null>(null);

  // Transfer offer form
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerUsername, setOfferUsername] = useState("");
  const [offerAmount, setOfferAmount] = useState("");

  // Publish form
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [listPrice, setListPrice] = useState("");
  const [listing, setListing] = useState<CardListing | null>(initialCard.listing ?? null);

  // Discard confirmation
  const [discardStep, setDiscardStep] = useState<0 | 1 | 2>(0);

  async function apiPost(url: string, body?: object) {
    const r = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }

  async function handleApplyCase() {
    setLoading("case");
    try {
      const d = await apiPost(`/api/cards/${card.id}/apply-case`);
      const updated = { ...card, hasCase: true };
      setCard(updated);
      setCases(d.cases);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      onUpdate(updated, d.cases);
      toast({ title: "¡Funda aplicada!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleRemoveCase() {
    setLoading("remove-case");
    try {
      const d = await apiPost(`/api/cards/${card.id}/remove-case`);
      const updated = { ...card, hasCase: false };
      setCard(updated);
      setCases(d.cases);
      onUpdate(updated, d.cases);
      toast({ title: "Funda removida", description: "Volvió a tu inventario." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }


  async function handleSendOffer() {
    if (!offerUsername.trim()) return toast({ title: "Error", description: "Ingresá un usuario", variant: "destructive" });
    const amt = parseFloat(offerAmount.replace(",", "."));
    if (isNaN(amt) || amt < 0) return toast({ title: "Error", description: "Monto inválido", variant: "destructive" });
    setLoading("offer");
    try {
      await apiPost(`/api/cards/${card.id}/offer`, { toUsername: offerUsername.trim(), amount: amt });
      toast({ title: "¡Oferta enviada!", description: `Esperando respuesta de @${offerUsername.trim()}.` });
      setShowOfferForm(false);
      setOfferUsername("");
      setOfferAmount("");
      onUpdate(card, cases);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleDiscard() {
    setLoading("discard");
    try {
      const d = await apiPost(`/api/cards/${card.id}/discard`);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Tarjeta desechada", description: `Recibiste ${fmtD(d.discardValue ?? 0.5)}.` });
      onDiscard(d.casesReturned ?? 0);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setDiscardStep(0);
    } finally { setLoading(null); }
  }

  async function handlePublish() {
    const price = parseFloat(listPrice.replace(",", "."));
    if (isNaN(price) || price <= 0) return toast({ title: "Error", description: "Ingresá un precio válido", variant: "destructive" });
    setLoading("publish");
    try {
      const d = await apiPost(`/api/cards/${card.id}/list`, { price });
      const newListing: CardListing = { id: d.listing.id, price: d.listing.price, status: "active" };
      setListing(newListing);
      setShowPublishForm(false);
      setListPrice("");
      const updated = { ...card, listing: newListing };
      onUpdate(updated, cases);
      toast({ title: "¡Publicado en el mercado!", description: `Precio: ${fmtDStr(d.listing.price)}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleCancelListing() {
    if (!listing) return;
    setLoading("cancel-listing");
    try {
      await apiPost(`/api/cards/listings/${listing.id}/cancel`);
      setListing(null);
      const updated = { ...card, listing: null };
      onUpdate(updated, cases);
      toast({ title: "Publicación cancelada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  const pct = card.percentage != null ? parseFloat(card.percentage) : null;
  const tier = pct != null ? getCardTier(pct) : null;

  return (
    <Modal isOpen onClose={onClose} title="">
      <div className="flex flex-col items-center gap-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
          <CardDisplay card={card} size="lg" />
        </motion.div>

        {tier != null && pct != null && (
          <div className="text-center">
            <p className="font-bold text-lg" style={{ color: TIER_ACCENT[tier] }}>{TIER_LABELS[tier]}</p>
            <p className="text-muted-foreground text-sm">{pct.toFixed(2).replace(".", ",")}%</p>
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          {/* Case */}
          <div className="bg-secondary rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">Funda protectora</span>
              <span className="text-sm font-medium" style={{ color: card.hasCase ? "#FFD700" : undefined }}>
                {card.hasCase ? "Equipada ✦" : `Sin funda (inventario: ${cases})`}
              </span>
            </div>
            {card.hasCase ? (
              <Button variant="outline" className="w-full" onClick={handleRemoveCase} isLoading={loading === "remove-case"} disabled={!!loading}>Sacar funda</Button>
            ) : (
              <Button className="w-full" onClick={handleApplyCase} isLoading={loading === "case"} disabled={!!loading || cases === 0}
                style={cases > 0 ? { background: "linear-gradient(135deg, #b8860b, #FFD700)", color: "#000" } : undefined}>
                {cases > 0 ? `Poner funda (tenés ${cases})` : "No tenés fundas"}
              </Button>
            )}
          </div>

          {/* Transfer */}
          <div className="bg-secondary rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Transferir carta</span>
              </div>
              {hasPendingOffer && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">Oferta activa</span>
              )}
            </div>

            {hasPendingOffer ? (
              <p className="text-sm text-muted-foreground">Ya hay una oferta activa para esta tarjeta. Cancelala desde la pestaña Ofertas para crear una nueva.</p>
            ) : !showOfferForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowOfferForm(true)} disabled={!!loading}>
                Enviar oferta de transferencia
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Usuario destinatario"
                  value={offerUsername}
                  onChange={e => setOfferUsername(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex flex-col items-center gap-1 py-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monto de oferta</p>
                  <p className="text-3xl font-extrabold tracking-tight">
                    {offerAmount ? fmtD(parseFloat(offerAmount.replace(",", ".")) || 0) : <span className="text-muted-foreground">D$0,00000</span>}
                  </p>
                </div>
                <NumericKeyboard value={offerAmount} onChange={setOfferAmount} />
                <p className="text-xs text-muted-foreground text-center">El destinatario tendrá que pagar este monto para recibir la carta.</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => { setShowOfferForm(false); setOfferUsername(""); setOfferAmount(""); }} disabled={!!loading}>Cancelar</Button>
                  <Button className="flex-1 text-sm" onClick={handleSendOffer} isLoading={loading === "offer"} disabled={!!loading}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />Enviar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Marketplace */}
          <div className="bg-secondary rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Mercado público</span>
              </div>
              {listing && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">Publicada</span>
              )}
            </div>

            {listing ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-background rounded-xl px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Precio publicado</span>
                  <span className="font-bold text-primary">{fmtDStr(listing.price)}</span>
                </div>
                <Button variant="outline" className="w-full text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleCancelListing} isLoading={loading === "cancel-listing"} disabled={!!loading}>
                  Cancelar publicación
                </Button>
              </div>
            ) : !showPublishForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowPublishForm(true)} disabled={!!loading}>
                <Globe className="w-3.5 h-3.5 mr-1.5" /> Publicar en mercado
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center gap-1 py-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Precio de venta</p>
                  <p className="text-3xl font-extrabold tracking-tight">
                    {listPrice ? fmtD(parseFloat(listPrice.replace(",", ".")) || 0) : <span className="text-muted-foreground">D$0,00000</span>}
                  </p>
                </div>
                <NumericKeyboard value={listPrice} onChange={setListPrice} />
                <p className="text-xs text-muted-foreground text-center">Cualquier usuario del banco podrá comprarla o hacerte una contraoferta.</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => { setShowPublishForm(false); setListPrice(""); }} disabled={!!loading}>Cancelar</Button>
                  <Button className="flex-1 text-sm" onClick={handlePublish} isLoading={loading === "publish"} disabled={!!loading}>
                    <Globe className="w-3.5 h-3.5 mr-1.5" /> Publicar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Discard */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-destructive" />
              <span className="font-semibold text-sm text-destructive">Deshacer carta</span>
            </div>

            {discardStep === 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-1">Deshacés la tarjeta y recibís <span className="font-semibold text-foreground">{fmtD(calcDiscardValue(card))}</span>. Esta acción no tiene vuelta atrás.</p>
                {card.hasCase && <p className="text-xs text-muted-foreground mb-3">· Incluye {fmtD(5)} por la funda.</p>}
                {!card.hasCase && <div className="mb-3" />}
                <Button variant="destructive" className="w-full" onClick={() => setDiscardStep(1)} disabled={!!loading}>
                  Deshacer carta
                </Button>
              </>
            )}

            {discardStep === 1 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">¿Seguro que querés deshacer esta tarjeta? Recibís <span className="font-bold">{fmtD(calcDiscardValue(card))}</span> y se elimina para siempre.</p>
                <div className="flex gap-2 mt-1">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => setDiscardStep(0)}>Cancelar</Button>
                  <Button variant="destructive" className="flex-1 text-sm" onClick={() => setDiscardStep(2)}>Sí, continuar</Button>
                </div>
              </div>
            )}

            {discardStep === 2 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold text-destructive">¿Última confirmación? Esta tarjeta desaparecerá para siempre.</p>
                <div className="flex gap-2 mt-1">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => setDiscardStep(0)} disabled={!!loading}>Cancelar</Button>
                  <Button variant="destructive" className="flex-1 text-sm" onClick={handleDiscard} isLoading={loading === "discard"} disabled={!!loading}>
                    Sí, destruir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── OffersTab ────────────────────────────────────────────────────────────────

function OffersTab({ offers, onRefresh }: { offers: { received: OfferFull[]; sent: OfferFull[] }; onRefresh: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [counterState, setCounterState] = useState<{ id: number; amount: string } | null>(null);

  async function apiPost(url: string, body?: object) {
    const r = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }

  async function handleAccept(offerId: number) {
    setLoading(`accept-${offerId}`);
    try {
      await apiPost(`/api/cards/offers/${offerId}/accept`);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "¡Oferta aceptada!", description: "La tarjeta fue transferida." });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleReject(offerId: number, label = "Oferta rechazada") {
    setLoading(`reject-${offerId}`);
    try {
      await apiPost(`/api/cards/offers/${offerId}/reject`);
      toast({ title: label });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleCounter(offerId: number) {
    const amt = counterState?.amount ?? "";
    const parsed = parseFloat(amt.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) return toast({ title: "Error", description: "Monto inválido", variant: "destructive" });
    setLoading(`counter-${offerId}`);
    try {
      await apiPost(`/api/cards/offers/${offerId}/counter`, { amount: parsed });
      toast({ title: "Contraoferta enviada" });
      setCounterState(null);
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  const totalActive = offers.received.length + offers.sent.length;

  if (totalActive === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="text-5xl mb-4">🤝</div>
        <p className="font-semibold text-lg">No hay ofertas activas</p>
        <p className="text-sm mt-2">Las ofertas de transferencia aparecerán acá.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Received */}
      {offers.received.length > 0 && (
        <div>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Recibidas ({offers.received.length})
          </h3>
          <div className="flex flex-col gap-3">
            {offers.received.map((offer) => {
              const isPending = offer.status === "pending";
              const iCountered = offer.status === "countered";
              const isCountering = counterState?.id === offer.id;
              const isLoading = (k: string) => loading === `${k}-${offer.id}`;

              return (
                <div key={offer.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <CardDisplay card={offer.card} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">@{offer.fromUser?.username}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">te quiere vender esta tarjeta</p>
                      <p className="font-bold text-base mt-1">{fmtDStr(offer.amount)}</p>
                      {iCountered && (
                        <p className="text-xs text-yellow-400 mt-1 font-medium">
                          Tu contraoferta de {fmtDStr(offer.counterAmount!)} está pendiente
                        </p>
                      )}
                    </div>
                  </div>

                  {isPending && !isCountering && (
                    <div className="flex gap-2 flex-wrap">
                      <Button className="flex-1 text-sm" onClick={() => handleAccept(offer.id)} isLoading={isLoading("accept")} disabled={!!loading}>
                        Aceptar
                      </Button>
                      <Button variant="outline" className="flex-1 text-sm" onClick={() => setCounterState({ id: offer.id, amount: "" })} disabled={!!loading}>
                        Contraoferta
                      </Button>
                      <Button variant="destructive" className="flex-1 text-sm" onClick={() => handleReject(offer.id, "Oferta rechazada")} isLoading={isLoading("reject")} disabled={!!loading}>
                        Rechazar
                      </Button>
                    </div>
                  )}

                  {isPending && isCountering && (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col items-center gap-1 py-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tu contraoferta</p>
                        <p className="text-2xl font-extrabold">
                          {counterState?.amount ? fmtD(parseFloat(counterState.amount.replace(",", ".")) || 0) : <span className="text-muted-foreground">D$0,00000</span>}
                        </p>
                      </div>
                      <NumericKeyboard
                        value={counterState?.amount ?? ""}
                        onChange={v => setCounterState({ id: offer.id, amount: v })}
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 text-sm" onClick={() => setCounterState(null)} disabled={!!loading}>Cancelar</Button>
                        <Button className="flex-1 text-sm" onClick={() => handleCounter(offer.id)} isLoading={isLoading("counter")} disabled={!!loading}>
                          Enviar contraoferta
                        </Button>
                      </div>
                    </div>
                  )}

                  {iCountered && (
                    <p className="text-xs text-muted-foreground text-center">Esperando que @{offer.fromUser?.username} responda tu contraoferta.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sent */}
      {offers.sent.length > 0 && (
        <div>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            Enviadas ({offers.sent.length})
          </h3>
          <div className="flex flex-col gap-3">
            {offers.sent.map((offer) => {
              const isPending = offer.status === "pending";
              const isCountered = offer.status === "countered";
              const isLoading = (k: string) => loading === `${k}-${offer.id}`;

              return (
                <div key={offer.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <CardDisplay card={offer.card} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Para @{offer.toUser?.username}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {isPending ? "Esperando respuesta..." : "Hizo una contraoferta"}
                      </p>
                      <p className="font-bold text-base mt-1">{fmtDStr(offer.amount)}</p>
                      {isCountered && (
                        <p className="text-sm text-yellow-400 font-bold mt-1">
                          Contraoferta: {fmtDStr(offer.counterAmount!)}
                        </p>
                      )}
                    </div>
                  </div>

                  {isPending && (
                    <Button variant="outline" className="w-full text-sm" onClick={() => handleReject(offer.id, "Oferta cancelada")} isLoading={isLoading("reject")} disabled={!!loading}>
                      Cancelar oferta
                    </Button>
                  )}

                  {isCountered && (
                    <div className="flex gap-2">
                      <Button className="flex-1 text-sm" onClick={() => handleAccept(offer.id)} isLoading={isLoading("accept")} disabled={!!loading}>
                        Aceptar contraoferta
                      </Button>
                      <Button variant="destructive" className="flex-1 text-sm" onClick={() => handleReject(offer.id, "Contraoferta rechazada")} isLoading={isLoading("reject")} disabled={!!loading}>
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CardsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const [tab, setTab] = useState<"tienda" | "mis-tarjetas" | "ofertas">("tienda");
  const [cards, setCards] = useState<Card[]>([]);
  const [cases, setCases] = useState(0);
  const [pendingOfferCardIds, setPendingOfferCardIds] = useState<number[]>([]);
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [offers, setOffers] = useState<{ received: OfferFull[]; sent: OfferFull[] }>({ received: [], sent: [] });
  const [tarjetasAvailable, setTarjetasAvailable] = useState(0);
  const [tarjetasTotal, setTarjetasTotal] = useState(0);
  const [buyingCard, setBuyingCard] = useState(false);
  const [revealCard, setRevealCard] = useState<Card | null>(null);
  const [nextPackAt, setNextPackAt] = useState<Date | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [skippingCooldown, setSkippingCooldown] = useState(false);

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);

  const fetchCards = useCallback(async (sort = sortAsc) => {
    try {
      const r = await fetch(`/api/cards?sort=${sort ? "asc" : "desc"}`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) {
        setCards(d.cards);
        setCases(d.cases);
        setPendingOfferCardIds(d.pendingOfferCardIds ?? []);
        setTarjetasAvailable(d.tarjetasAvailable ?? 0);
        setTarjetasTotal(d.tarjetasTotal ?? 0);
        if (d.nextPackAt) {
          const next = new Date(d.nextPackAt);
          if (next > new Date()) setNextPackAt(next); else setNextPackAt(null);
        } else {
          setNextPackAt(null);
        }
      }
    } catch {}
  }, [sortAsc]);

  useEffect(() => {
    if (!nextPackAt) { setCooldownSecs(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((nextPackAt.getTime() - Date.now()) / 1000));
      setCooldownSecs(diff);
      if (diff === 0) setNextPackAt(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextPackAt]);

  const fetchOffers = useCallback(async () => {
    try {
      const r = await fetch("/api/cards/offers", { credentials: "include" });
      const d = await r.json();
      if (r.ok) setOffers(d);
    } catch {}
  }, []);

  useEffect(() => { fetchCards(sortAsc); fetchOffers(); }, [sortAsc]);

  async function handleComprar() {
    setBuyingCard(true);
    try {
      const r = await fetch("/api/cards/tarjetas/comprar", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) {
        if (d.nextPackAt) {
          const next = new Date(d.nextPackAt);
          setNextPackAt(next);
        }
        toast({ title: "Error", description: d.error ?? "No se pudo comprar", variant: "destructive" });
        return;
      }
      if (d.nextPackAt) setNextPackAt(new Date(d.nextPackAt));
      setRevealCard(d.card);
      fetchCards(sortAsc);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBuyingCard(false);
    }
  }

  async function handleSkipCooldown() {
    setSkippingCooldown(true);
    try {
      const r = await fetch("/api/cards/skip-cooldown", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Error al omitir espera");
      setNextPackAt(null);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "¡Espera omitida!", description: "Ya podés comprar otra tarjeta." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSkippingCooldown(false);
    }
  }


  function handleCardUpdate(updatedCard: Card, newCases: number) {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    setCases(newCases);
    if (selectedCard?.id === updatedCard.id) setSelectedCard(updatedCard);
  }

  function handleCardDiscard(casesReturned: number = 0) {
    setCards(prev => prev.filter(c => c.id !== selectedCard?.id));
    setPendingOfferCardIds(prev => prev.filter(id => id !== selectedCard?.id));
    if (casesReturned > 0) setCases(prev => prev + casesReturned);
    setSelectedCard(null);
  }

  // ── Selection mode helpers ──
  function enterSelectionMode(card: Card) {
    setSelectionMode(true);
    setSelectedIds(new Set([card.id]));
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleCardSelection(cardId: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }

  function onCardInteract(card: Card) {
    if (selectionMode) {
      toggleCardSelection(card.id);
    } else {
      setSelectedCard(card);
    }
  }

  function makeLongPressProps(card: Card) {
    const start = () => {
      wasLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        wasLongPress.current = true;
        longPressTimer.current = null;
        enterSelectionMode(card);
      }, 550);
    };
    const cancel = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };
    return {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: (_e: React.TouchEvent) => start(),
      onTouchEnd: cancel,
      onTouchMove: cancel,
      onClick: () => {
        if (wasLongPress.current) { wasLongPress.current = false; return; }
        onCardInteract(card);
      },
    };
  }

  async function handleBulkDiscard() {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    try {
      const r = await fetch("/api/cards/bulk-discard", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: ids }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCards(prev => prev.filter(c => !selectedIds.has(c.id)));
      setPendingOfferCardIds(prev => prev.filter(id => !selectedIds.has(id)));
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: `${ids.length} tarjeta${ids.length > 1 ? "s" : ""} desechada${ids.length > 1 ? "s" : ""}`, description: `Recibiste ${fmtD(d.totalEarned ?? ids.length * 0.5)}.` });
      exitSelectionMode();
      setBulkConfirm(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBulkLoading(false); }
  }

  async function handleBuyCase() {
    setLoading("case");
    try {
      const r = await fetch("/api/cards/buy-case", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCases(d.cases);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "¡Funda comprada!", description: "Podés aplicarla en cualquier tarjeta." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  const pendingReceivedCount = offers.received.filter(o => o.status === "pending").length;
  const tierOrder: CardTier[] = ["red", "orange", "yellow", "violet", "blue", "rainbow"];
  const bulkDiscardTotal = Array.from(selectedIds).reduce((sum, id) => {
    const c = cards.find(x => x.id === id);
    return sum + (c ? calcDiscardValue(c) : 0.5);
  }, 0);

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <style>{`
        @keyframes rainbowShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-display font-bold">Tarjetas</h1>
          {me && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold leading-none mb-0.5">Saldo</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {fmtDStr(me.balance)}
              </span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-sm">Coleccioná, mejorá y transferí tus tarjetas.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 bg-secondary rounded-2xl p-1.5">
        {(["tienda", "mis-tarjetas", "ofertas"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "ofertas") fetchOffers(); }}
            className={`flex-1 py-2.5 px-2 rounded-xl font-semibold text-sm transition-all duration-200 relative ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "tienda" ? "Tienda" : t === "mis-tarjetas" ? `Mis Tarjetas${cards.length ? ` (${cards.length})` : ""}` : "Ofertas"}
            {t === "ofertas" && pendingReceivedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingReceivedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── TIENDA ────────────────────────────────────────────────────────── */}
        {tab === "tienda" && (
          <motion.div key="tienda" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }} className="flex flex-col gap-5">

            {/* ── Comprar tarjeta aleatoria ── */}
            <div className="bg-card rounded-3xl border border-border p-6">
              <div className="flex items-start gap-4 mb-5">
                <span className="text-4xl">🎴</span>
                <div>
                  <h2 className="font-bold text-xl">Comprar tarjeta</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Te toca una tarjeta aleatoria del catálogo.
                  </p>
                  <p className="text-sm mt-1.5">
                    <span className="font-bold text-foreground">{tarjetasAvailable}</span>
                    <span className="text-muted-foreground"> de {tarjetasTotal} tarjeta{tarjetasTotal !== 1 ? "s" : ""} disponible{tarjetasAvailable !== 1 ? "s" : ""}</span>
                  </p>
                  {tarjetasAvailable === 0 && tarjetasTotal > 0 && (
                    <p className="text-xs text-yellow-500 font-semibold mt-1">Ya tenés todas las tarjetas.</p>
                  )}
                </div>
              </div>
              {cooldownSecs > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-secondary rounded-2xl px-4 py-3">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-medium">Próxima compra disponible en</p>
                      <p className="font-bold text-foreground tabular-nums">
                        {String(Math.floor(cooldownSecs / 60)).padStart(2, "0")}:{String(cooldownSecs % 60).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSkipCooldown}
                    isLoading={skippingCooldown}
                    disabled={skippingCooldown}
                    className="w-full py-5 text-sm font-bold border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Omitir espera — D$5,00000
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleComprar}
                  isLoading={buyingCard}
                  disabled={buyingCard || tarjetasAvailable === 0}
                  className="w-full py-6 text-base font-bold"
                >
                  Comprar tarjeta — D$1,00000
                </Button>
              )}
            </div>

            {/* ── Funda protectora ── */}
            <div className="bg-card rounded-3xl border border-border p-6">
              <div className="flex items-start gap-4 mb-5">
                <span className="text-4xl">✨</span>
                <div>
                  <h2 className="font-bold text-xl">Funda protectora</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Brillo dorado especial. Se guardan en tu inventario y las ponés cuando quieras.{" "}
                    <span className="font-semibold text-foreground">Inventario: {cases} funda{cases !== 1 ? "s" : ""}</span>
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleBuyCase} isLoading={loading === "case"} disabled={!!loading} className="w-full py-6 text-base font-bold">
                Comprar funda — D$10,00000
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── MIS TARJETAS ──────────────────────────────────────────────────── */}
        {tab === "mis-tarjetas" && (
          <motion.div key="mis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
            {cards.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <div className="text-6xl mb-5">🃏</div>
                <p className="font-semibold text-xl">No tenés tarjetas todavía</p>
                <p className="text-sm mt-2">Adquirí tarjetas desde la Tienda para empezar.</p>
              </div>
            ) : (
              <>
                {/* ── Header bar ── */}
                {selectionMode ? (
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <span className="text-sm font-semibold">
                      {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedIds(new Set(cards.map(c => c.id)))}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Todas
                      </button>
                      <button
                        onClick={exitSelectionMode}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg border border-border"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-muted-foreground text-sm">
                      {cards.length} tarjeta{cards.length !== 1 ? "s" : ""}
                      {cases > 0 && <span className="ml-2 text-yellow-500 font-medium">· {cases} funda{cases !== 1 ? "s" : ""}</span>}
                    </p>
                    <button onClick={() => setSortAsc(v => !v)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowUpDown className="w-4 h-4" />
                      {sortAsc ? "Menor a mayor" : "Mayor a menor"}
                    </button>
                  </div>
                )}

                {!selectionMode && (
                  <p className="text-xs text-muted-foreground mb-3 text-center select-none">
                    Mantené presionada una tarjeta para seleccionar varias
                  </p>
                )}

                {/* ── Card grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {cards.map(card => {
                    const isSelected = selectedIds.has(card.id);
                    const lpProps = makeLongPressProps(card);
                    return (
                      <motion.div
                        key={card.id}
                        layout
                        whileHover={selectionMode ? {} : { scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex flex-col items-center gap-2 cursor-pointer relative select-none"
                        {...lpProps}
                      >
                        <div className={`relative transition-all duration-150 ${isSelected ? "ring-2 ring-primary ring-offset-2 rounded-2xl" : ""}`}>
                          <CardDisplay card={card} size="sm" />
                          {/* Selection circle */}
                          {selectionMode && (
                            <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow ${isSelected ? "bg-primary" : "bg-background/80 border-2 border-border"}`}>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                            </div>
                          )}
                          {pendingOfferCardIds.includes(card.id) && (
                            <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-black font-bold px-1.5 py-0.5 rounded-full leading-none">
                              Oferta
                            </span>
                          )}
                          {card.listing && !pendingOfferCardIds.includes(card.id) && (
                            <span className="absolute top-2 right-2 text-[10px] bg-green-500 text-black font-bold px-1.5 py-0.5 rounded-full leading-none">
                              Mercado
                            </span>
                          )}
                        </div>
                        {!selectionMode && (
                          <span className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium">Ver carta</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* ── Floating bulk discard bar ── */}
                <AnimatePresence>
                  {selectionMode && selectedIds.size > 0 && (
                    <motion.div
                      key="bulk-bar"
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 80, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm"
                    >
                      <button
                        onClick={() => setBulkConfirm(true)}
                        className="w-full py-4 px-6 rounded-2xl font-bold text-sm bg-destructive text-destructive-foreground shadow-2xl flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Deshacer {selectedIds.size} tarjeta{selectedIds.size !== 1 ? "s" : ""}
                        </span>
                        <span className="opacity-80">{fmtD(bulkDiscardTotal)}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}

        {/* ── OFERTAS ───────────────────────────────────────────────────────── */}
        {tab === "ofertas" && (
          <motion.div key="ofertas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
            <OffersTab offers={offers} onRefresh={() => { fetchOffers(); fetchCards(sortAsc); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          cases={cases}
          hasPendingOffer={pendingOfferCardIds.includes(selectedCard.id)}
          onClose={() => setSelectedCard(null)}
          onUpdate={(updated, newCases) => {
            handleCardUpdate(updated, newCases);
            fetchOffers();
          }}
          onDiscard={handleCardDiscard}
        />
      )}

      {/* Reveal card modal */}
      {revealCard && (
        <Modal isOpen onClose={() => setRevealCard(null)} title="¡Te tocó esta tarjeta!">
          <div className="flex flex-col items-center gap-5">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.1 }}
            >
              <CardDisplay card={revealCard} size="lg" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="font-bold text-xl text-center"
            >
              {revealCard.nombre}
            </motion.p>
            <Button className="w-full" onClick={() => setRevealCard(null)}>
              ¡Genial!
            </Button>
          </div>
        </Modal>
      )}

      {/* Bulk discard confirm modal */}
      {bulkConfirm && (
        <Modal isOpen onClose={() => setBulkConfirm(false)} title="Deshacer tarjetas">
          <div className="flex flex-col gap-5">
            <div className="bg-secondary rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-destructive">{selectedIds.size}</p>
              <p className="text-sm text-muted-foreground mt-1">tarjeta{selectedIds.size !== 1 ? "s" : ""} a desechar</p>
            </div>
            <div className="flex justify-between items-center px-1 text-sm">
              <span className="text-muted-foreground">Ganarías</span>
              <span className="font-bold text-lg">{fmtD(bulkDiscardTotal)}</span>
            </div>
            {Array.from(selectedIds).some(id => cards.find(c => c.id === id)?.hasCase) && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center bg-yellow-500/10 rounded-xl px-3 py-2">
                ✨ Incluye D$5,00000 extra por cada funda
              </p>
            )}
            <p className="text-sm text-muted-foreground text-center">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setBulkConfirm(false)} disabled={bulkLoading}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleBulkDiscard} isLoading={bulkLoading} disabled={bulkLoading}>
                Sí, desechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
