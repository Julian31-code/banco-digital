import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Clock, CheckCircle2, AlertCircle, Wallet, Building2 } from "lucide-react";

type GridCell = {
  id: number;
  isMine: boolean;
  isTaken?: boolean;
  balance?: string;
  isPopular?: boolean;
};

function fmtD(amount: number): string {
  const [intPart, decPart] = amount.toFixed(5).split(".");
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `D$${intFmt},${decPart}`;
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type ResultModal = {
  action: "bought" | "already_owned";
  propertyId: number;
  newBalance: number;
  isPopular?: boolean;
} | null;

export default function PropiedadesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();

  const [grid, setGrid] = useState<GridCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [interacting, setInteracting] = useState<number | null>(null);
  const [nextExpropAt, setNextExpropAt] = useState<Date | null>(null);
  const [countdownSecs, setCountdownSecs] = useState(0);
  const [resultModal, setResultModal] = useState<ResultModal>(null);
  const [confirmCell, setConfirmCell] = useState<GridCell | null>(null);

  const fetchGrid = useCallback(async () => {
    try {
      const r = await fetch("/api/properties/grid", { credentials: "include" });
      const d = await r.json();
      if (r.ok) {
        setGrid(d.grid ?? []);
        if (d.nextExpropiacionAt) setNextExpropAt(new Date(d.nextExpropiacionAt));
      }
    } catch (e) {
      console.error("Grid fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  useEffect(() => {
    if (!nextExpropAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.ceil((nextExpropAt.getTime() - Date.now()) / 1000));
      setCountdownSecs(diff);
      if (diff === 0) fetchGrid();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextExpropAt, fetchGrid]);

  function handleCellClick(cell: GridCell) {
    if (cell.isMine) {
      toast({ title: "Esta propiedad es tuya", description: "Podés administrarla desde Mis Propiedades." });
      return;
    }
    setConfirmCell(cell);
  }

  async function handleConfirmInteract() {
    if (!confirmCell) return;
    const propId = confirmCell.id;
    setConfirmCell(null);
    setInteracting(propId);
    try {
      const r = await fetch(`/api/properties/${propId}/interact`, {
        method: "POST",
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) {
        toast({ title: "Error", description: d.error ?? "No se pudo completar la acción", variant: "destructive" });
        return;
      }
      setResultModal({ action: d.action, propertyId: propId, newBalance: d.newBalance, isPopular: d.isPopular });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      fetchGrid();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setInteracting(null);
    }
  }

  const myCount = grid.filter(c => c.isMine).length;
  const takenCount = grid.filter(c => !c.isMine && c.isTaken).length;
  const freeCount = grid.filter(c => !c.isMine && !c.isTaken).length;
  const userBalance = user?.balance != null ? parseFloat(user.balance as any) : null;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="mb-5">
        <h1 className="text-3xl font-display font-bold tracking-tight">Propiedades</h1>
        <p className="text-muted-foreground text-sm mt-1">Comprá propiedades y acumulá D$ hasta la próxima expropiación.</p>
      </div>

      {/* Saldo + Timer */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {userBalance !== null && (
          <div className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Wallet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Tu saldo</p>
              <p className="font-bold text-sm text-foreground">{fmtD(userBalance)}</p>
            </div>
          </div>
        )}
        <div className={`bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-3 ${userBalance === null ? "col-span-2" : ""}`}>
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Expropiación en</p>
            <p className="font-bold text-sm tabular-nums text-foreground">{countdownSecs > 0 ? formatCountdown(countdownSecs) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
          <span className="text-muted-foreground">Mías <span className="font-bold text-foreground">{myCount}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 inline-block" />
          <span className="text-muted-foreground">Popular</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-muted border border-border/60 inline-block" />
          <span className="text-muted-foreground">Disponibles <span className="font-bold text-foreground">{freeCount + takenCount}</span></span>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-3xl p-3">
          <div className="grid grid-cols-10 gap-1">
            {grid.map((cell) => {
              const isMyPopular = cell.isMine && cell.isPopular;
              const isLoading = interacting === cell.id;

              let cellClass = "";
              if (isMyPopular) {
                cellClass = "bg-yellow-500 text-yellow-950 shadow-sm ring-1 ring-yellow-400/60";
              } else if (cell.isMine) {
                cellClass = "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/60";
              } else {
                cellClass = "bg-muted/60 text-muted-foreground border border-border/40 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all";
              }

              return (
                <motion.button
                  key={cell.id}
                  whileTap={{ scale: 0.88 }}
                  disabled={isLoading}
                  onClick={() => handleCellClick(cell)}
                  className={`aspect-square rounded-xl text-[11px] font-bold flex items-center justify-center select-none ${cellClass} ${isLoading ? "opacity-50" : ""}`}
                >
                  {isLoading ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    cell.id
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmCell && (
          <Modal isOpen onClose={() => setConfirmCell(null)} title={`Propiedad #${confirmCell.id}`}>
            <div className="flex flex-col gap-4">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-bold text-lg">Propiedad #{confirmCell.id}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Costo: <span className="font-bold text-foreground">D$11,00000</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Interactuás con la propiedad por D$11,00000. Podés venderla desde Mis Propiedades cuando quieras.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmCell(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleConfirmInteract}>Confirmar — D$11,00000</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {resultModal && (
          <Modal isOpen onClose={() => setResultModal(null)} title="">
            <div className="flex flex-col items-center gap-4 py-2">
              {resultModal.action === "bought" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xl">¡Propiedad #{resultModal.propertyId} comprada!</p>
                    <p className="text-muted-foreground text-sm mt-1">Ahora es tuya. Empieza con <span className="font-semibold text-foreground">D$10,00000</span> de saldo.</p>
                    <p className="text-xs text-muted-foreground mt-3">Tu saldo: <span className="font-bold text-foreground">{fmtD(resultModal.newBalance)}</span></p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-500/15 flex items-center justify-center">
                    <AlertCircle className="w-9 h-9 text-rose-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xl">Propiedad #{resultModal.propertyId} tenía dueño</p>
                    {resultModal.isPopular ? (
                      <p className="text-muted-foreground text-sm mt-1">
                        Era <span className="font-bold text-yellow-500">Popular</span>. Los D$10,00000 se repartieron entre todas las propiedades populares.
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm mt-1">
                        Se le sumaron <span className="font-semibold text-foreground">D$10,00000</span> al balance de esa propiedad.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">Tu saldo: <span className="font-bold text-foreground">{fmtD(resultModal.newBalance)}</span></p>
                  </div>
                </>
              )}
              <Button className="w-full" onClick={() => setResultModal(null)}>Entendido</Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
