import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetReserves, useUpdateReserve, useDeleteReserve, useDepositToReserve, useWithdrawFromReserve, getGetReservesQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { formatDolar, extractError, parseAmount } from "@/lib/utils";
import { ArrowLeft, Edit2, Trash2, ArrowDownToLine, ArrowUpFromLine, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";

export default function PersonalReservePage() {
  const [match, params] = useRoute("/reservas/personal/:id");
  const [_, setLocation] = useLocation();
  const id = Number(params?.id);
  
  const { data: reserves } = useGetReserves();
  const reserve = reserves?.find(r => r.id === id);
  
  const [actionModal, setActionModal] = useState<'deposit' | 'withdraw' | 'rename' | 'delete' | null>(null);
  const [amount, setAmount] = useState("");
  const [newName, setNewName] = useState(reserve?.name || "");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const renameMut = useUpdateReserve();
  const deleteMut = useDeleteReserve();
  const depositMut = useDepositToReserve();
  const withdrawMut = useWithdrawFromReserve();

  if (!reserve) return <div className="p-8 text-center text-muted-foreground">Reserva no encontrada</div>;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetReservesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionModal === 'rename') {
      renameMut.mutate({ reserveId: id, data: { name: newName } }, {
        onSuccess: () => { toast({ title: "Nombre actualizado" }); setActionModal(null); invalidate(); },
        onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" })
      });
    } else if (actionModal === 'deposit') {
      depositMut.mutate({ reserveId: id, data: { amount: parseAmount(amount) } }, {
        onSuccess: () => { toast({ title: "Dinero ingresado" }); setAmount(""); setActionModal(null); invalidate(); },
        onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" })
      });
    } else if (actionModal === 'withdraw') {
      withdrawMut.mutate({ reserveId: id, data: { amount: parseAmount(amount) } }, {
        onSuccess: () => { toast({ title: "Dinero retirado" }); setAmount(""); setActionModal(null); invalidate(); },
        onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" })
      });
    } else if (actionModal === 'delete') {
      deleteMut.mutate({ reserveId: id }, {
        onSuccess: () => { toast({ title: "Reserva eliminada" }); invalidate(); setLocation("/reservas"); },
        onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" })
      });
    }
  };

  const canDelete = parseFloat(reserve.balance) === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => setLocation("/reservas")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors mb-6">
        <ArrowLeft className="w-5 h-5" /> Volver a reservas
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl p-8 shadow-xl border overflow-hidden relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
               <PiggyBank className="w-8 h-8" />
             </div>
             <div>
               <h1 className="text-3xl font-display font-bold">{reserve.name}</h1>
               <p className="text-muted-foreground font-medium mt-1">Reserva Personal</p>
             </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => { setNewName(reserve.name); setActionModal('rename'); }} className="p-3 bg-muted text-foreground hover:bg-secondary rounded-xl transition-colors" title="Cambiar nombre">
              <Edit2 className="w-5 h-5" />
            </button>
            <button onClick={() => setActionModal('delete')} className="p-3 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-xl transition-colors" title="Eliminar">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 sm:p-10 text-white shadow-inner mb-8">
           <p className="text-slate-400 font-medium tracking-widest uppercase text-sm mb-2">Saldo Ahorrado</p>
           <h2 className="text-5xl sm:text-6xl font-display font-extrabold tracking-tight">{formatDolar(reserve.balance)}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <Button onClick={() => setActionModal('deposit')} className="py-5 text-lg shadow-primary/20">
             <ArrowDownToLine className="w-6 h-6" /> Ingresar dinero
           </Button>
           <Button variant="outline" onClick={() => setActionModal('withdraw')} className="py-5 text-lg border-2">
             <ArrowUpFromLine className="w-6 h-6" /> Sacar dinero
           </Button>
        </div>
      </motion.div>

      <Modal isOpen={actionModal !== null} onClose={() => { setActionModal(null); setAmount(""); }} title={
        actionModal === 'rename' ? 'Cambiar Nombre' : 
        actionModal === 'delete' ? 'Eliminar Reserva' : 
        actionModal === 'deposit' ? 'Ingresar Dinero' : 'Sacar Dinero'
      }>
        <form onSubmit={handleAction} className="space-y-5">
          {actionModal === 'rename' && (
            <div>
              <label className="block text-sm font-semibold mb-2 ml-1">Nuevo nombre</label>
              <Input required value={newName} onChange={e => setNewName(e.target.value)} maxLength={50} />
            </div>
          )}

          {(actionModal === 'deposit' || actionModal === 'withdraw') && (
            <div className="space-y-4">
              <div className="bg-muted/60 rounded-2xl px-5 py-4 flex items-baseline gap-2">
                <span className="text-muted-foreground font-bold text-xl">D$</span>
                <span className="font-mono text-4xl font-bold text-foreground tracking-tight flex-1">
                  {amount || <span className="text-muted-foreground/50">0</span>}
                </span>
              </div>
              <NumericKeyboard value={amount} onChange={setAmount} />
            </div>
          )}

          {actionModal === 'delete' && (
            <p className="text-muted-foreground text-base">
              {!canDelete 
                ? "No podés eliminar esta reserva porque todavía tiene saldo. Vaciá la reserva primero para poder eliminarla."
                : "¿Estás seguro que querés eliminar esta reserva? Esta acción no se puede deshacer."}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setActionModal(null)}>Cancelar</Button>
            {actionModal === 'delete' ? (
               <Button type="submit" variant="destructive" className="w-full sm:w-auto" disabled={!canDelete || deleteMut.isPending}>
                 {deleteMut.isPending ? "Eliminando..." : "Eliminar Reserva"}
               </Button>
            ) : (
               <Button
                 type="submit"
                 className="w-full sm:w-auto"
                 disabled={
                   (actionModal === 'deposit' || actionModal === 'withdraw') && (!amount || parseFloat(parseAmount(amount)) <= 0)
                 }
                 isLoading={renameMut.isPending || depositMut.isPending || withdrawMut.isPending}
               >
                 Confirmar
               </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
