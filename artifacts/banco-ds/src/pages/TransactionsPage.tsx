import { useState } from "react";
import { useGetTransactions, useGetMe } from "@workspace/api-client-react";
import { formatDolar } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Clock, Calendar, User, Hash, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }) + " " + d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }) + " · " + d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type Tx = {
  id: number;
  type: string;
  amount: string;
  description?: string | null;
  counterpartUsername?: string | null;
  createdAt: string;
};

export default function TransactionsPage() {
  const { data: txs, isLoading } = useGetTransactions();
  const { data: me } = useGetMe();
  const [selected, setSelected] = useState<Tx | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <h1 className="text-4xl font-display font-bold text-foreground">Movimientos</h1>
      <p className="text-muted-foreground -mt-4">Últimos 100 movimientos de tu cuenta.</p>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl h-20 animate-pulse border border-border/50" />
          ))}
        </div>
      )}

      {!isLoading && (!txs || txs.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl p-12 text-center border border-border/60"
        >
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Todavía no tenés movimientos registrados.</p>
          <p className="text-sm text-muted-foreground mt-1">Acá vas a ver las transferencias y movimientos de reservas.</p>
        </motion.div>
      )}

      {!isLoading && txs && txs.length > 0 && (
        <div className="space-y-3">
          {txs.map((tx, i) => {
            const isIngreso = tx.type === "ingreso";
            return (
              <motion.button
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => setSelected(tx as Tx)}
                className="w-full text-left bg-card rounded-2xl p-4 border border-border/60 flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isIngreso
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {isIngreso
                    ? <ArrowDownLeft className="w-6 h-6" />
                    : <ArrowUpRight className="w-6 h-6" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-sm leading-tight">
                    {tx.description}
                  </p>
                  {tx.counterpartUsername && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      @{tx.counterpartUsername}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(tx.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-bold font-mono text-sm ${
                    isIngreso
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }`}>
                    {isIngreso ? "+" : "-"}{formatDolar(tx.amount)}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${
                    isIngreso ? "text-green-600/70 dark:text-green-400/70" : "text-destructive/70"
                  }`}>
                    {isIngreso ? "Ingreso" : "Egreso"}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (() => {
            const isIngreso = selected.type === "ingreso";
            const myUsername = (me as any)?.username;
            const fromUser = isIngreso ? (selected.counterpartUsername || "—") : (myUsername || "Vos");
            const toUser = isIngreso ? (myUsername || "Vos") : (selected.counterpartUsername || "—");
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isIngreso ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"
                    }`}>
                      {isIngreso ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <span>Detalle del movimiento</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div className="text-center py-4 bg-muted/30 rounded-2xl">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      {isIngreso ? "Ingreso" : "Egreso"}
                    </p>
                    <p className={`font-mono text-3xl font-black ${
                      isIngreso ? "text-green-600 dark:text-green-400" : "text-destructive"
                    }`}>
                      {isIngreso ? "+" : "-"}{formatDolar(selected.amount)}
                    </p>
                  </div>

                  <div className="space-y-3 px-1">
                    {selected.counterpartUsername && (
                      <>
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">De</p>
                            <p className="font-semibold text-foreground">@{fromUser}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Para</p>
                            <p className="font-semibold text-foreground">@{toUser}</p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Fecha y hora</p>
                        <p className="font-semibold text-foreground capitalize">{formatFullDate(selected.createdAt)}</p>
                      </div>
                    </div>

                    {selected.description && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Descripción</p>
                          <p className="font-medium text-foreground">{selected.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Hash className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">N° de movimiento</p>
                        <p className="font-mono font-semibold text-foreground">#{selected.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
