import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetSharedReserves, useGetMe, useUpdateSharedReserve, useDeleteSharedReserve, 
  useDepositToSharedReserve, useWithdrawFromSharedReserve, 
  useAddSharedReserveMember, useRemoveSharedReserveMember, useLeaveSharedReserve,
  getGetSharedReservesQueryKey, getGetMeQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { formatDolar, extractError, parseAmount } from "@/lib/utils";
import { ArrowLeft, Edit2, Trash2, ArrowDownToLine, ArrowUpFromLine, Users, LogOut, UserPlus, ShieldAlert, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function SharedReservePage() {
  const [match, params] = useRoute("/reservas/compartida/:id");
  const [_, setLocation] = useLocation();
  const id = Number(params?.id);
  
  const { data: reserves } = useGetSharedReserves();
  const { data: me } = useGetMe();
  const reserve = reserves?.find(r => r.id === id);
  
  const [actionModal, setActionModal] = useState<'deposit' | 'withdraw' | 'rename' | 'delete' | 'addMember' | 'leave' | null>(null);
  const [amount, setAmount] = useState("");
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [addMemberError, setAddMemberError] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const renameMut = useUpdateSharedReserve();
  const deleteMut = useDeleteSharedReserve();
  const depositMut = useDepositToSharedReserve();
  const withdrawMut = useWithdrawFromSharedReserve();
  const addMemberMut = useAddSharedReserveMember();
  const removeMemberMut = useRemoveSharedReserveMember();
  const leaveMut = useLeaveSharedReserve();

  if (!reserve) return <div className="p-8 text-center text-muted-foreground">Reserva no encontrada</div>;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetSharedReservesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const isOnlyMember = reserve.members.length === 1;

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
    } else if (actionModal === 'addMember') {
      setAddMemberError("");
      addMemberMut.mutate({ reserveId: id, data: { username: newUsername } }, {
        onSuccess: () => { toast({ title: "Miembro agregado" }); setNewUsername(""); setAddMemberError(""); setActionModal(null); invalidate(); },
        onError: err => {
          const msg = extractError(err);
          setAddMemberError(msg);
        }
      });
    } else if (actionModal === 'leave') {
      leaveMut.mutate({ reserveId: id }, {
        onSuccess: () => { toast({ title: "Saliste de la reserva" }); invalidate(); setLocation("/reservas"); },
        onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" })
      });
    }
  };

  const handleExpel = (userId: number) => {
    removeMemberMut.mutate({ reserveId: id, userId }, {
      onSuccess: (res) => {
        toast({ title: res.removed ? "Miembro expulsado" : "Voto registrado", description: res.message });
        invalidate();
      },
      onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" })
    });
  };

  const canDelete = parseFloat(reserve.balance) === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => setLocation("/reservas")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors mb-4">
        <ArrowLeft className="w-5 h-5" /> Volver a reservas
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-card rounded-3xl p-8 shadow-xl border relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center">
                 <Users className="w-8 h-8" />
               </div>
               <div>
                 <h1 className="text-3xl font-display font-bold line-clamp-1">{reserve.name}</h1>
                 <p className="text-muted-foreground font-medium mt-1 flex items-center gap-2">Compartida <span className="w-1 h-1 rounded-full bg-border" /> {reserve.members.length} miembros</p>
               </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setNewName(reserve.name); setActionModal('rename'); }} className="p-3 bg-muted text-foreground hover:bg-secondary rounded-xl transition-colors">
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => !isOnlyMember && setActionModal('leave')}
                className={`p-3 rounded-xl transition-colors ${isOnlyMember ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed" : "bg-muted text-foreground hover:bg-secondary"}`}
                title={isOnlyMember ? "Sos el único miembro. Eliminá la reserva en su lugar." : "Salir de reserva"}
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button onClick={() => setActionModal('delete')} className="p-3 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-xl transition-colors" title="Eliminar">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-[2rem] p-8 sm:p-10 text-white shadow-inner mb-8">
             <p className="text-purple-300 font-medium tracking-widest uppercase text-sm mb-2">Saldo Total Compartido</p>
             <h2 className="text-5xl sm:text-6xl font-display font-extrabold tracking-tight">{formatDolar(reserve.balance)}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button onClick={() => setActionModal('deposit')} className="py-5 text-lg bg-purple-600 hover:bg-purple-700 shadow-purple-600/25">
               <ArrowDownToLine className="w-6 h-6" /> Ingresar dinero
             </Button>
             <Button variant="outline" onClick={() => setActionModal('withdraw')} className="py-5 text-lg border-2">
               <ArrowUpFromLine className="w-6 h-6" /> Sacar dinero
             </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-3xl p-6 shadow-xl border flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-xl">Miembros</h3>
            <button onClick={() => { setNewUsername(""); setAddMemberError(""); setActionModal('addMember'); }} className="w-10 h-10 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl flex items-center justify-center transition-colors">
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
             {reserve.members.map((m: any) => (
               <div key={m.userId} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted transition-colors group border border-transparent hover:border-border">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-muted border flex items-center justify-center font-bold text-sm overflow-hidden shadow-sm">
                       {m.avatarUrl ? <img src={m.avatarUrl} className="w-full h-full object-cover" /> : m.username[0].toUpperCase()}
                     </div>
                     <div>
                       <p className="font-bold leading-tight">{m.username}</p>
                       <p className="text-xs text-muted-foreground mt-0.5">{new Date(m.joinedAt).toLocaleDateString()}</p>
                     </div>
                  </div>
                  {m.userId !== me?.id && (
                    <button 
                      onClick={() => handleExpel(m.userId)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                      title="Votar para expulsar"
                    >
                       <ShieldAlert className="w-4 h-4" />
                    </button>
                  )}
               </div>
             ))}
          </div>

          {isOnlyMember && (
            <div className="mt-4 p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-medium flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Sos el único miembro. Para salirte, primero agregá a alguien.
            </div>
          )}
        </motion.div>
      </div>

      <Modal isOpen={actionModal !== null} onClose={() => { setActionModal(null); setAmount(""); setAddMemberError(""); }} title={
        actionModal === 'rename' ? 'Cambiar Nombre' : 
        actionModal === 'delete' ? 'Eliminar Reserva' : 
        actionModal === 'leave' ? 'Salir de la Reserva' : 
        actionModal === 'addMember' ? 'Agregar Persona' : 
        actionModal === 'deposit' ? 'Ingresar Dinero' : 'Sacar Dinero'
      }>
        <form onSubmit={handleAction} className="space-y-5">
          {actionModal === 'rename' && (
            <div>
              <label className="block text-sm font-semibold mb-2 ml-1">Nuevo nombre</label>
              <Input required value={newName} onChange={e => setNewName(e.target.value)} maxLength={50} />
            </div>
          )}

          {actionModal === 'addMember' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold mb-2 ml-1">Usuario a agregar</label>
              <Input
                required
                value={newUsername}
                onChange={e => { setNewUsername(e.target.value); setAddMemberError(""); }}
                placeholder="nombre de usuario"
                className={addMemberError ? "border-destructive focus:ring-destructive" : ""}
              />
              {addMemberError && (
                <p className="text-destructive text-sm font-medium flex items-center gap-1.5 ml-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {addMemberError}
                </p>
              )}
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
                : "¿Estás seguro que querés eliminar esta reserva? Todos los miembros perderán acceso."}
            </p>
          )}

          {actionModal === 'leave' && (
            <p className="text-muted-foreground text-base">¿Estás seguro que querés salirte de esta reserva compartida? Perderás acceso al dinero que quede en ella.</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setActionModal(null); setAddMemberError(""); }}>Cancelar</Button>
            {(actionModal === 'delete' || actionModal === 'leave') ? (
               <Button type="submit" variant="destructive" className="w-full sm:w-auto" disabled={actionModal === 'delete' && !canDelete} isLoading={deleteMut.isPending || leaveMut.isPending}>
                 Confirmar
               </Button>
            ) : (
               <Button
                 type="submit"
                 className="w-full sm:w-auto"
                 disabled={
                   (actionModal === 'deposit' || actionModal === 'withdraw') && (!amount || parseFloat(parseAmount(amount)) <= 0)
                 }
                 isLoading={renameMut.isPending || depositMut.isPending || withdrawMut.isPending || addMemberMut.isPending}
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
