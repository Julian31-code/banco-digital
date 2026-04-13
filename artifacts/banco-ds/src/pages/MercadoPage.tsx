import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { ShoppingBag, Tag, Clock, ChevronDown, ChevronUp, RefreshCw, Inbox } from "lucide-react";
import {
  CardDisplay,
  fmtD,
  fmtDStr,
} from "@/lib/cardUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingCard = { id: number; percentage: string | null; hasCase: boolean; powerPoints: number; nombre?: string | null; imagenUrl?: string | null };

type PublicListing = {
  id: number; price: string; status: string; createdAt: string;
  sellerId: number; isMine: boolean; pendingOffersCount: number;
  card: ListingCard;
  seller: { id: number; username: string };
};

type IncomingOffer = {
  id: number; listingId: number; amount: string; status: string; createdAt: string;
  buyer: { id: number; username: string };
};

type MyListing = {
  id: number; price: string; status: string; createdAt: string;
  card: ListingCard;
  pendingOffers: IncomingOffer[];
};

type SentOffer = {
  id: number; listingId: number; amount: string; status: string; createdAt: string;
  listing: { id: number; price: string; status: string };
  card: ListingCard;
  seller: { username: string };
};

// ─── Utilities ────────────────────────────────────────────────────────────────

async function apiPost(url: string, body?: object) {
  const r = await fetch(url, {
    method: "POST", credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}

async function apiGet(url: string) {
  const r = await fetch(url, { credentials: "include" });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── BuyModal ─────────────────────────────────────────────────────────────────

function BuyModal({ listing, onClose, onSuccess }: {
  listing: PublicListing;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    setLoading(true);
    try {
      await apiPost(`/api/cards/listings/${listing.id}/buy`);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "¡Tarjeta comprada!", description: `Costo: ${fmtDStr(listing.price)}` });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setStep(1);
    } finally { setLoading(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title="Comprar tarjeta">
      <div className="flex flex-col items-center gap-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
          <CardDisplay card={listing.card} size="lg" />
        </motion.div>
        <p className="font-bold text-xl text-center">{listing.card.nombre ?? `#${listing.card.id}`}</p>
        <div className="w-full bg-secondary rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Precio</span>
          <span className="text-xl font-extrabold text-primary">{fmtDStr(listing.price)}</span>
        </div>
        <div className="w-full bg-secondary rounded-2xl p-3 text-sm text-muted-foreground">
          Vendedor: <span className="font-bold text-foreground">@{listing.seller.username}</span>
        </div>
        {step === 1 && (
          <div className="w-full flex flex-col gap-2">
            <Button className="w-full" onClick={() => setStep(2)}>
              <ShoppingBag className="w-4 h-4 mr-2" /> Confirmar compra
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
          </div>
        )}
        {step === 2 && (
          <div className="w-full flex flex-col gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 text-center">
              <p className="text-sm font-bold text-yellow-400">Confirmación final</p>
              <p className="text-xs text-muted-foreground mt-1">Se debitarán <span className="font-bold text-foreground">{fmtDStr(listing.price)}</span> de tu saldo.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={loading}>Atrás</Button>
              <Button className="flex-1" onClick={handleBuy} isLoading={loading}>Comprar ahora</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── OfferModal ───────────────────────────────────────────────────────────────

function OfferModal({ listing, onClose, onSuccess }: {
  listing: PublicListing;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOffer() {
    const parsed = parseFloat(amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return toast({ title: "Error", description: "Ingresá un monto válido", variant: "destructive" });
    setLoading(true);
    try {
      await apiPost(`/api/cards/listings/${listing.id}/offer`, { amount: parsed });
      toast({ title: "Oferta enviada", description: `Le llegará a @${listing.seller.username}.` });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Modal isOpen onClose={onClose} title="Hacer contraoferta">
      <div className="flex flex-col gap-4">
        <div className="bg-secondary rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Precio publicado</span>
          <span className="font-bold text-primary">{fmtDStr(listing.price)}</span>
        </div>
        <div className="flex flex-col items-center gap-1 py-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tu oferta</p>
          <p className="text-4xl font-extrabold tracking-tight">
            {amount ? fmtD(parseFloat(amount.replace(",", ".")) || 0) : <span className="text-muted-foreground">D$0,00000</span>}
          </p>
        </div>
        <NumericKeyboard value={amount} onChange={setAmount} />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button className="flex-1" onClick={handleOffer} isLoading={loading}>
            <Tag className="w-4 h-4 mr-2" /> Enviar oferta
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── CardZoomModal ────────────────────────────────────────────────────────────

function CardZoomModal({ card, onClose }: { card: ListingCard; onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="">
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
        >
          <CardDisplay card={card} size="lg" />
        </motion.div>
      </div>
    </Modal>
  );
}

// ─── ListingCardItem ──────────────────────────────────────────────────────────

function ListingCardItem({ listing, onBuy, onOffer, onCancel, onZoom, cancelLoading }: {
  listing: PublicListing;
  onBuy: () => void;
  onOffer: () => void;
  onCancel: () => void;
  onZoom: () => void;
  cancelLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-3xl p-4 flex flex-col gap-3 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <button onClick={onZoom} className="flex-shrink-0 active:scale-95 transition-transform">
          <CardDisplay card={listing.card} size="sm" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug">{listing.card.nombre ?? `Tarjeta #${listing.card.id}`}</p>
          <p className="text-xs text-muted-foreground mt-0.5">@{listing.seller.username}</p>
          {listing.pendingOffersCount > 0 && (
            <p className="text-xs text-yellow-400 mt-1 font-medium">{listing.pendingOffersCount} oferta{listing.pendingOffersCount > 1 ? "s" : ""} pendiente{listing.pendingOffersCount > 1 ? "s" : ""}</p>
          )}
        </div>
      </div>
      <div className="bg-secondary rounded-2xl px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Precio</span>
        <span className="font-extrabold text-lg text-primary">{fmtDStr(listing.price)}</span>
      </div>
      {listing.isMine ? (
        <Button variant="outline" className="w-full text-sm text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onCancel} isLoading={cancelLoading}>
          Cancelar publicación
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 text-sm" onClick={onOffer}>
            <Tag className="w-3.5 h-3.5 mr-1" /> Oferta
          </Button>
          <Button className="flex-1 text-sm" onClick={onBuy}>
            <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Comprar
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─── MyListingItem ────────────────────────────────────────────────────────────

function MyListingItem({ listing, onAcceptOffer, onRejectOffer, onCancel, loading }: {
  listing: MyListing;
  onAcceptOffer: (offerId: number, listingId: number) => void;
  onRejectOffer: (offerId: number) => void;
  onCancel: (listingId: number) => void;
  loading: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    active: "text-green-400 bg-green-400/10",
    sold: "text-blue-400 bg-blue-400/10",
    cancelled: "text-muted-foreground bg-muted",
  };

  return (
    <div className="bg-card border border-border/60 rounded-3xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <CardDisplay card={listing.card} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug">{listing.card.nombre ?? `Tarjeta #${listing.card.id}`}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[listing.status] ?? "text-muted-foreground"}`}>
              {listing.status === "active" ? "Activa" : listing.status === "sold" ? "Vendida" : "Cancelada"}
            </span>
            <span className="text-xs text-muted-foreground">{fmtDStr(listing.price)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {fmtDate(listing.createdAt)}
          </p>
        </div>
      </div>

      {listing.pendingOffers.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-sm font-semibold text-yellow-400 bg-yellow-400/10 rounded-xl px-3 py-2"
        >
          <span>{listing.pendingOffers.length} contraoferta{listing.pendingOffers.length > 1 ? "s" : ""} recibida{listing.pendingOffers.length > 1 ? "s" : ""}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      <AnimatePresence>
        {expanded && listing.pendingOffers.map((offer) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-secondary rounded-2xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">@{offer.buyer.username}</span>
              <span className="text-sm font-extrabold text-primary">{fmtDStr(offer.amount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{fmtDate(offer.createdAt)}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 text-xs py-1.5" onClick={() => onRejectOffer(offer.id)} isLoading={loading === `reject-${offer.id}`} disabled={!!loading}>
                Rechazar
              </Button>
              <Button className="flex-1 text-xs py-1.5" onClick={() => onAcceptOffer(offer.id, listing.id)} isLoading={loading === `accept-${offer.id}`} disabled={!!loading}>
                Aceptar {fmtDStr(offer.amount)}
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {listing.status === "active" && listing.pendingOffers.length === 0 && (
        <Button variant="outline" className="w-full text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => onCancel(listing.id)} isLoading={loading === `cancel-${listing.id}`} disabled={!!loading}>
          Cancelar publicación
        </Button>
      )}
    </div>
  );
}

// ─── MercadoPage ──────────────────────────────────────────────────────────────

export default function MercadoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"mercado" | "actividad">("mercado");
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [sentOffers, setSentOffers] = useState<SentOffer[]>([]);
  const [fetching, setFetching] = useState(false);
  const [activityFetching, setActivityFetching] = useState(false);
  const [zoomCard, setZoomCard] = useState<ListingCard | null>(null);
  const [buyTarget, setBuyTarget] = useState<PublicListing | null>(null);
  const [offerTarget, setOfferTarget] = useState<PublicListing | null>(null);
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMercado = useCallback(async () => {
    setFetching(true);
    try {
      const d = await apiGet("/api/cards/listings");
      setListings(d.listings ?? []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setFetching(false); }
  }, [toast]);

  const fetchActivity = useCallback(async () => {
    setActivityFetching(true);
    try {
      const d = await apiGet("/api/cards/listings/my-activity");
      setMyListings(d.myListings ?? []);
      setSentOffers(d.sentOffers ?? []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setActivityFetching(false); }
  }, [toast]);

  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  function ensureTab(t: "mercado" | "actividad") {
    setTab(t);
    if (!loadedTabs.has(t)) {
      setLoadedTabs(prev => new Set([...prev, t]));
      if (t === "mercado") fetchMercado();
      else fetchActivity();
    }
  }

  useState(() => { ensureTab("mercado"); });

  async function handleCancelListing(listingId: number, fromActivity = false) {
    setCancelLoading(listingId);
    try {
      await apiPost(`/api/cards/listings/${listingId}/cancel`);
      toast({ title: "Publicación cancelada" });
      if (fromActivity) fetchActivity(); else fetchMercado();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setCancelLoading(null); }
  }

  async function handleAcceptOffer(offerId: number) {
    setActionLoading(`accept-${offerId}`);
    try {
      await apiPost(`/api/cards/listings/offers/${offerId}/accept`);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "¡Oferta aceptada!", description: "La tarjeta fue transferida." });
      fetchActivity();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  async function handleRejectOffer(offerId: number) {
    setActionLoading(`reject-${offerId}`);
    try {
      await apiPost(`/api/cards/listings/offers/${offerId}/reject`);
      toast({ title: "Oferta rechazada" });
      fetchActivity();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  const tabs = [
    { id: "mercado" as const, label: "Mercado", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "actividad" as const, label: "Mi actividad", icon: <Inbox className="w-4 h-4" /> },
  ];

  const hasPendingActivity = myListings.some(l => l.pendingOffers.length > 0);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Mercado</h1>
          <p className="text-muted-foreground text-sm mt-1">Adquirí tarjetas del catálogo o gestioná tus publicaciones.</p>
        </div>
        <button
          onClick={() => tab === "mercado" ? fetchMercado() : fetchActivity()}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
          disabled={fetching || activityFetching}
        >
          <RefreshCw className={`w-5 h-5 ${fetching || activityFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-secondary rounded-2xl p-1 gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => ensureTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
            {t.id === "actividad" && hasPendingActivity && (
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-yellow-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Mercado Tab */}
      {tab === "mercado" && (
        <>
          {fetching ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="text-5xl mb-4">🏪</div>
              <p className="font-semibold text-lg">No hay tarjetas publicadas</p>
              <p className="text-sm mt-2">Cuando alguien publique una tarjeta, aparecerá acá.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listings.map(listing => (
                <ListingCardItem
                  key={listing.id}
                  listing={listing}
                  onBuy={() => setBuyTarget(listing)}
                  onOffer={() => setOfferTarget(listing)}
                  onCancel={() => handleCancelListing(listing.id)}
                  onZoom={() => setZoomCard(listing.card)}
                  cancelLoading={cancelLoading === listing.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Mi actividad Tab */}
      {tab === "actividad" && (
        <>
          {activityFetching ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* My listings */}
              <div>
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" /> Mis publicaciones
                </h3>
                {myListings.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-secondary rounded-3xl">
                    <p className="font-semibold">No publicaste ninguna tarjeta</p>
                    <p className="text-sm mt-1">Publicá tarjetas desde la sección Tarjetas.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myListings.map(listing => (
                      <MyListingItem
                        key={listing.id}
                        listing={listing}
                        onAcceptOffer={(offerId) => handleAcceptOffer(offerId)}
                        onRejectOffer={(offerId) => handleRejectOffer(offerId)}
                        onCancel={(listingId) => handleCancelListing(listingId, true)}
                        loading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sent offers */}
              <div>
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Mis ofertas enviadas
                </h3>
                {sentOffers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-secondary rounded-3xl">
                    <p className="font-semibold">No hiciste ninguna oferta</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {sentOffers.map(offer => {
                      const statusLabel: Record<string, string> = { pending: "Pendiente", accepted: "Aceptada", rejected: "Rechazada" };
                      const statusColor: Record<string, string> = {
                        pending: "text-yellow-400 bg-yellow-400/10",
                        accepted: "text-green-400 bg-green-400/10",
                        rejected: "text-muted-foreground bg-muted",
                      };
                      return (
                        <div key={offer.id} className="bg-card border border-border/60 rounded-3xl p-4 flex items-center gap-3">
                          <CardDisplay card={offer.card} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{offer.card.nombre ?? `Tarjeta #${offer.card.id}`}</p>
                            <p className="text-xs text-muted-foreground">@{offer.seller.username}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[offer.status] ?? ""}`}>
                                {statusLabel[offer.status] ?? offer.status}
                              </span>
                              <span className="text-xs font-bold text-foreground">{fmtDStr(offer.amount)}</span>
                              <span className="text-xs text-muted-foreground">(publicado: {fmtDStr(offer.listing.price)})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

      {/* Modals */}
      {zoomCard && <CardZoomModal card={zoomCard} onClose={() => setZoomCard(null)} />}
      {buyTarget && (
        <BuyModal
          listing={buyTarget}
          onClose={() => setBuyTarget(null)}
          onSuccess={() => { setBuyTarget(null); fetchMercado(); }}
        />
      )}
      {offerTarget && (
        <OfferModal
          listing={offerTarget}
          onClose={() => setOfferTarget(null)}
          onSuccess={() => { setOfferTarget(null); fetchActivity(); ensureTab("actividad"); }}
        />
      )}
    </div>
  );
}
