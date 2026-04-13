import { useGetTransactions } from "@workspace/api-client-react";
import { formatDolar } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Clock, Wallet } from "lucide-react";
import { motion } from "framer-motion";

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

export default function TransactionsPage() {
  const { data: txs, isLoading } = useGetTransactions();

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
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                className="bg-card rounded-2xl p-4 border border-border/60 flex items-center gap-4"
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
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
