import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pickaxe, Crown } from "lucide-react";

type Mineral = "ruby" | "emerald" | "diamond" | "legendaryJewel" | null;

interface MineResponse {
  balance: string;
  diamond: string;
  ruby: string;
  emerald: string;
  legendaryJewel: string;
  mineral: Mineral;
}

function fmt(v: string | undefined): string {
  const n = parseFloat(v || "0");
  return n.toFixed(5).replace(".", ",");
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

export default function MiningPage() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [balance, setBalance] = useState("0");
  const [legendaryJewel, setLegendaryJewel] = useState("0");

  const [autoMining, setAutoMining] = useState(false);
  const [holdMining, setHoldMining] = useState(false);
  const [winFlash, setWinFlash] = useState(0);
  const [rate, setRate] = useState(2);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const stopRef = useRef(false);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  useEffect(() => {
    if (user) {
      setBalance((user as any).balance ?? "0");
      setLegendaryJewel((user as any).legendaryJewel ?? "0");
    }
  }, [user]);

  const mine = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const r = await fetch("/api/mining/mine", { method: "POST", credentials: "include" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        stopAll();
        toast({ title: "Minería detenida", description: err.error || "Error al minar", variant: "destructive" });
        return;
      }
      const data: MineResponse = await r.json();
      setBalance(data.balance);
      setLegendaryJewel(data.legendaryJewel);
      vibrate(40);
      if (data.mineral) {
        setWinFlash((x) => x + 1);
      }
    } catch (e) {
      stopAll();
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      inFlightRef.current = false;
    }
  };

  const startMining = () => {
    if (intervalRef.current) return;
    stopRef.current = false;
    mine();
    intervalRef.current = setInterval(() => {
      if (stopRef.current) return;
      mine();
    }, Math.round(1000 / rateRef.current));
  };

  const restartMining = () => {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    startMining();
  };

  useEffect(() => {
    if (intervalRef.current) restartMining();
  }, [rate]);

  const stopMining = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopRef.current = true;
  };

  const stopAll = () => {
    stopMining();
    setAutoMining(false);
    setHoldMining(false);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  useEffect(() => {
    if (autoMining || holdMining) startMining();
    else stopMining();
    return () => stopMining();
  }, [autoMining, holdMining]);

  useEffect(() => {
    return () => {
      stopMining();
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setHoldMining(true);
  };
  const handlePointerUp = () => {
    if (holdMining) {
      setHoldMining(false);
    } else {
      setAutoMining((v) => !v);
    }
  };

  const isMining = autoMining || holdMining;

  return (
    <div className="max-w-xl mx-auto py-6 select-none">
      <div className="bg-card rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Saldo en el banco</p>
          <p className="font-mono text-4xl sm:text-5xl font-black text-foreground tracking-tight">
            D$ {fmt(balance)}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <motion.button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => holdMining && setHoldMining(false)}
            onContextMenu={(e) => e.preventDefault()}
            animate={isMining ? { scale: [1, 0.92, 1] } : { scale: 1 }}
            transition={isMining ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full flex items-center justify-center shadow-2xl transition-colors active:scale-95 touch-none ${
              isMining
                ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground"
                : "bg-gradient-to-br from-muted to-muted/60 text-foreground hover:from-primary/30 hover:to-primary/10"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Pickaxe className="w-20 h-20 sm:w-24 sm:h-24" strokeWidth={1.5} />
            <AnimatePresence>
              {winFlash > 0 && (
                <motion.div
                  key={winFlash}
                  initial={{ opacity: 1, y: 0, scale: 0.5 }}
                  animate={{ opacity: 0, y: -80, scale: 1.4 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute pointer-events-none"
                >
                  <Crown className="w-14 h-14 text-yellow-400 drop-shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            {isMining
              ? holdMining
                ? "Manteniendo... soltá para parar"
                : "Minado automático activado. Tocá de nuevo para parar."
              : "Tocá para minar automáticamente, o mantené presionado."}
          </p>
        </div>

        <div className="bg-muted/40 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Velocidad
            </label>
            <span className="font-mono font-bold text-foreground text-sm">
              {rate} {rate === 1 ? "vez/seg" : "veces/seg"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl px-4 py-4 bg-yellow-400/10 border-2 border-yellow-400/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-yellow-400 shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">Joya Legendaria</p>
              <p className="text-xs text-muted-foreground">0,01% por minado</p>
            </div>
          </div>
          <span className="font-mono text-2xl font-bold text-yellow-400">{fmt(legendaryJewel)}</span>
        </div>
      </div>
    </div>
  );
}
