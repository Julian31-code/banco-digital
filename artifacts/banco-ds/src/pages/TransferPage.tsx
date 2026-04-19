import { useState } from "react";
import { motion } from "framer-motion";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { extractError, parseAmount } from "@/lib/utils";
import { Send, ArrowRightLeft } from "lucide-react";
import { useLocation } from "wouter";

const CURRENCIES = [
  { key: "DS", label: "D$", short: "D$" },
  { key: "legendaryJewel", label: "Joya Legendaria", short: "👑" },
] as const;

type CurrencyKey = typeof CURRENCIES[number]["key"];

export default function TransferPage() {
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyKey>("DS");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const [_, setLocation] = useLocation();

  const currentCurrency = CURRENCIES.find((c) => c.key === currency)!;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !amount) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/transfers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUsername: username, amount: parseAmount(amount), currency }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      toast({ title: "Transferencia Exitosa", description: data.message });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setUsername("");
      setAmount("");
      setTimeout(() => setLocation("/"), 1500);
    } catch (err: any) {
      toast({ title: "No se pudo transferir", description: extractError(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const balanceForCurrency = (() => {
    if (!user) return "0";
    const u = user as any;
    if (currency === "DS") return u.balance ?? "0";
    return u[currency] ?? "0";
  })();

  return (
    <div className="max-w-xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <ArrowRightLeft className="w-64 h-64 -mt-20 -mr-20" />
        </div>

        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary mb-8">
          <Send className="w-8 h-8" />
        </div>

        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Nueva Transferencia</h2>
        <p className="text-muted-foreground mb-6">Enviá tus activos de forma segura.</p>

        <div className="mb-6">
          <label className="block text-xs font-semibold mb-2 ml-1 text-muted-foreground uppercase tracking-wider">Moneda</label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {CURRENCIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCurrency(c.key)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all border-2 ${
                  currency === c.key
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-muted text-foreground border-transparent hover:border-border"
                }`}
              >
                <span className="mr-1.5">{c.short}</span>
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 ml-1">
            Disponible: <span className="font-mono font-bold text-foreground">{currentCurrency.short} {parseFloat(balanceForCurrency).toFixed(5).replace(".", ",")}</span>
          </p>
        </div>

        <form onSubmit={handleTransfer} className="space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Destinatario</label>
            <Input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
              className="text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Monto</label>
            <div className="bg-muted/60 rounded-2xl px-5 py-4 mb-4 flex items-baseline gap-2">
              <span className="text-muted-foreground font-bold text-xl">{currentCurrency.short}</span>
              <span className="font-mono text-4xl font-bold text-foreground tracking-tight flex-1">
                {amount || <span className="text-muted-foreground/50">0</span>}
              </span>
            </div>
            <NumericKeyboard value={amount} onChange={setAmount} />
          </div>

          <Button type="submit" className="w-full py-4 text-lg mt-4" isLoading={submitting} disabled={!username || !amount}>
            {submitting ? "Procesando..." : "Confirmar Transferencia"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
