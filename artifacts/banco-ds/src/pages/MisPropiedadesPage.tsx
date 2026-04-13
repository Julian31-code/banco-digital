import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Clock, Building2, TrendingUp, RefreshCw, Star, Wallet } from "lucide-react";

type Property = {
  id: number;
  ownerId: number;
  balance: string;
  purchasedAt: string;
  isPopular: boolean;
};

function fmtD(amount: number): string {
  const [intPart, decPart] = amount.toFixed(5).split(".");
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `D$${intFmt},${decPart}`;
}

function fmtDStr(s: string): string {
  return fmtD(parseFloat(s));
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MisPropiedadesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState<number | null>(null);
  const [togglingPopular, setTogglingPopular] = useState<number | null>(null);
  const [confirmSell, setConfirmSell] = useState<Property | null>(null);
  const [nextExpropAt, setNextExpropAt] = useState<Date | null>(null);
  const [countdownSecs, setCountdownSecs] = useState(0);

  const fetchMine = useCallback(async () => {
    try {
      const r = await fetch("/api/properties/mine", { credentials: "include" });
      const d = await r.json();
      if (r.ok) {
        setProperties(d.properties ?? []);
        if (d.nextExpropiacionAt) setNextExpropAt(new Date(d.nextExpropiacionAt));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  useEffect(() => {
    if (!nextExpropAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.ceil((nextExpropAt.getTime() - Date.now()) / 1000));
      setCountdownSecs(diff);
      if (diff === 0) fetchMine();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextExpropAt, fetchMine]);

  async function handleTogglePopular(prop: Property) {
    setTogglingPopular(prop.id);
    try {
      const r = await fetch(`/api/properties/${prop.id}/popular`, {
        method: "POST",
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo cambiar");
      setProperties(prev => prev.map(p => p.id === prop.id ? { ...p, isPopular: d.isPopular } : p));
      toast({
        title: d.isPopular ? `Propiedad #${prop.id} es ahora Popular ⭐` : `Propiedad #${prop.id} ya no es Popular`,
        description: d.isPopular
          ? "Los pagos a esta propiedad se repartirán entre todas las populares."
          : "Los pagos a esta propiedad irán directo a su balance.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTogglingPopular(null);
    }
  }

  async function handleSell(prop: Property) {
    setSelling(prop.id);
    setConfirmSell(null);
    try {
      const r = await fetch(`/api/properties/${prop.id}/sell`, {
        method: "POST",
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo vender");
      toast({
        title: `Propiedad #${prop.id} vendida`,
        description: `Recibiste ${fmtD(d.earned)}.`,
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      fetchMine();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSelling(null);
    }
  }

  const totalBalance = properties.reduce((sum, p) => sum + parseFloat(p.balance), 0);
  const popularCount = properties.filter(p => p.isPopular).length;
  const userBalance = user?.balance != null ? parseFloat(user.balance as any) : null;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Mis Propiedades</h1>
          <p className="text-muted-foreground text-sm mt-1">Administrá y vendé tus propiedades.</p>
        </div>
        <button
          onClick={fetchMine}
          disabled={loading}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all mt-1"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Saldo del usuario */}
      {userBalance !== null && (
        <div className="bg-card border border-border/60 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
          <Wallet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Tu saldo</span>
          <span className="ml-auto font-bold text-base">{fmtD(userBalance)}</span>
        </div>
      )}

      {/* Timer */}
      <div className="bg-card border border-border/60 rounded-3xl px-5 py-4 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Próxima expropiación</p>
          <p className="font-bold text-xl tabular-nums">{countdownSecs > 0 ? formatCountdown(countdownSecs) : "—"}</p>
        </div>
      </div>

      {/* Summary */}
      {properties.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border/60 rounded-2xl p-4 text-center">
            <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{properties.length}</p>
            <p className="text-xs text-muted-foreground">Propiedades</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-4 text-center">
            <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-500">{fmtD(totalBalance)}</p>
            <p className="text-xs text-muted-foreground">Balance total</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-4 text-center">
            <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-500">{popularCount}</p>
            <p className="text-xs text-muted-foreground">Populares</p>
          </div>
        </div>
      )}

      {/* Popular explanation */}
      {properties.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3 mb-5 text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed">
          <span className="font-bold">⭐ Popular:</span> Cuando alguien interactúa con una propiedad Popular, los D$10,00000 se reparten en partes iguales entre <strong>todas</strong> tus propiedades populares en vez de ir solo a esa propiedad.
        </div>
      )}

      {/* Properties list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <div className="text-6xl mb-5">🏗️</div>
          <p className="font-semibold text-xl">No tenés propiedades</p>
          <p className="text-sm mt-2">Comprá propiedades desde la sección Propiedades.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {properties.sort((a, b) => a.id - b.id).map((prop) => (
            <motion.div
              key={prop.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-card border rounded-2xl px-4 py-3.5 flex items-center gap-3.5 transition-all duration-200 ${
                prop.isPopular
                  ? "border-yellow-500/50 shadow-[0_0_0_1px_rgba(234,179,8,0.15)] bg-yellow-500/[0.04]"
                  : "border-border/50"
              }`}
            >
              {/* Left: number badge */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm tabular-nums ${
                prop.isPopular
                  ? "bg-yellow-500/15 text-yellow-500"
                  : "bg-primary/10 text-primary"
              }`}>
                #{prop.id}
              </div>

              {/* Center: balance + badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Saldo</span>
                  {prop.isPopular && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-px rounded-full font-bold tracking-wide">⭐ POPULAR</span>
                  )}
                </div>
                <p className="text-lg font-extrabold text-foreground leading-none">{fmtDStr(prop.balance)}</p>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Popular toggle */}
                <button
                  onClick={() => handleTogglePopular(prop)}
                  disabled={togglingPopular === prop.id}
                  title={prop.isPopular ? "Desactivar Popular" : "Activar Popular"}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    prop.isPopular
                      ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                      : "bg-secondary text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-500"
                  } ${togglingPopular === prop.id ? "opacity-50" : ""}`}
                >
                  {togglingPopular === prop.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Star className={`w-3.5 h-3.5 ${prop.isPopular ? "fill-yellow-500" : ""}`} />
                  )}
                </button>

                {/* Sell */}
                <Button
                  variant="outline"
                  className="text-xs px-3 py-1.5 h-8 rounded-xl font-semibold"
                  onClick={() => setConfirmSell(prop)}
                  isLoading={selling === prop.id}
                  disabled={selling === prop.id}
                >
                  Vender
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirm Sell Modal */}
      <AnimatePresence>
        {confirmSell && (
          <Modal isOpen onClose={() => setConfirmSell(null)} title={`Vender Propiedad #${confirmSell.id}`}>
            <div className="flex flex-col gap-4">
              <div className="bg-secondary rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Recibirás</span>
                <span className="font-extrabold text-xl text-green-500">{fmtDStr(confirmSell.balance)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                La propiedad se liberará y recibirás exactamente su balance actual. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmSell(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={() => handleSell(confirmSell)}>
                  Vender ahora
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
