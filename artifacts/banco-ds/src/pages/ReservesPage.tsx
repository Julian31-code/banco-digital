import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetReserves, useGetSharedReserves, useCreateReserve, useCreateSharedReserve, getGetReservesQueryKey, getGetSharedReservesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { extractError, formatDolar, cn } from "@/lib/utils";
import { PiggyBank, Users, Plus, X, Inbox } from "lucide-react";
import { Link } from "wouter";

export default function ReservesPage() {
  const [tab, setTab] = useState<'personal' | 'shared'>('personal');
  const { data: personalReserves = [], isLoading: loadingPersonal } = useGetReserves();
  const { data: sharedReserves = [], isLoading: loadingShared } = useGetSharedReserves();
  
  const [isNewPersonalOpen, setIsNewPersonalOpen] = useState(false);
  const [isNewSharedOpen, setIsNewSharedOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold">Mis Reservas</h1>
          <p className="text-muted-foreground mt-2">Separa tu plata y organizá tus gastos.</p>
        </div>

        <div className="flex bg-muted/50 p-1.5 rounded-2xl w-full md:w-auto md:min-w-[320px]">
          <button 
            onClick={() => setTab('personal')} 
            className={cn("flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2", tab === 'personal' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
          >
            <PiggyBank className="w-4 h-4" /> Personales
          </button>
          <button 
            onClick={() => setTab('shared')} 
            className={cn("flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2", tab === 'shared' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
          >
            <Users className="w-4 h-4" /> Compartidas
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'personal' ? (
            <PersonalReservesList 
              reserves={personalReserves} 
              onNew={() => setIsNewPersonalOpen(true)} 
              isLoading={loadingPersonal}
            />
          ) : (
            <SharedReservesList 
              reserves={sharedReserves} 
              onNew={() => setIsNewSharedOpen(true)} 
              isLoading={loadingShared}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <NewPersonalReserveModal isOpen={isNewPersonalOpen} onClose={() => setIsNewPersonalOpen(false)} />
      <NewSharedReserveModal isOpen={isNewSharedOpen} onClose={() => setIsNewSharedOpen(false)} />
    </div>
  );
}

function PersonalReservesList({ reserves, onNew, isLoading }: any) {
  if (isLoading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={onNew}
          className="border-2 border-dashed border-border rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer min-h-[200px]"
        >
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold">Nueva Reserva</span>
        </div>

        {reserves.map((r: any) => (
          <Link key={r.id} href={`/reservas/personal/${r.id}`}>
            <div className="bg-card border rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 min-h-[200px] flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <PiggyBank className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-foreground line-clamp-1">{r.name}</h3>
              </div>
              <p className="text-3xl font-display font-bold text-foreground mt-4">{formatDolar(r.balance)}</p>
            </div>
          </Link>
        ))}
      </div>
      
      {reserves.length === 0 && (
        <div className="mt-12 text-center text-muted-foreground">
          <Inbox className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>No tenés reservas personales todavía.</p>
        </div>
      )}
    </div>
  );
}

function SharedReservesList({ reserves, onNew, isLoading }: any) {
  if (isLoading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={onNew}
          className="border-2 border-dashed border-border rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer min-h-[200px]"
        >
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <span className="font-bold">Nueva Compartida</span>
        </div>

        {reserves.map((r: any) => (
          <Link key={r.id} href={`/reservas/compartida/${r.id}`}>
            <div className="bg-card border rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 min-h-[200px] flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex -space-x-2">
                    {r.members.slice(0, 3).map((m: any, i: number) => (
                      <div key={m.userId} className="w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-bold z-10 relative" style={{zIndex: 10 - i}}>
                        {m.avatarUrl ? <img src={m.avatarUrl} className="w-full h-full rounded-full object-cover" /> : m.username[0].toUpperCase()}
                      </div>
                    ))}
                    {r.members.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold z-0 relative">
                        +{r.members.length - 3}
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-lg text-foreground line-clamp-1">{r.name}</h3>
              </div>
              <p className="text-3xl font-display font-bold text-foreground mt-4">{formatDolar(r.balance)}</p>
            </div>
          </Link>
        ))}
      </div>

      {reserves.length === 0 && (
        <div className="mt-12 text-center text-muted-foreground">
          <Inbox className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>No participás en ninguna reserva compartida.</p>
        </div>
      )}
    </div>
  );
}

function NewPersonalReserveModal({ isOpen, onClose }: any) {
  const [name, setName] = useState("");
  const createMut = useCreateReserve();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createMut.mutate({ data: { name } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetReservesQueryKey() });
        toast({ title: "Reserva creada" });
        setName("");
        onClose();
      },
      onError: (err) => toast({ title: "Error", description: extractError(err), variant: "destructive" })
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Reserva Personal">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 ml-1">Nombre de la reserva</label>
          <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Vacaciones" maxLength={50} />
        </div>
        <Button className="w-full" type="submit" isLoading={createMut.isPending}>Crear Reserva</Button>
      </form>
    </Modal>
  );
}

function NewSharedReserveModal({ isOpen, onClose }: any) {
  const [name, setName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const createMut = useCreateSharedReserve();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      setMemberInput("");
    }
  };

  const removeMember = (m: string) => {
    setMembers(members.filter(x => x !== m));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createMut.mutate({ data: { name, memberUsernames: members } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSharedReservesQueryKey() });
        toast({ title: "Reserva compartida creada" });
        setName("");
        setMembers([]);
        onClose();
      },
      onError: (err) => toast({ title: "Error", description: extractError(err), variant: "destructive" })
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reserva Compartida">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 ml-1">Nombre de la reserva</label>
          <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Regalo de Cumpleaños" maxLength={50} />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-2 ml-1">Invitar usuarios</label>
          <div className="flex gap-2">
            <Input 
              value={memberInput} 
              onChange={e => setMemberInput(e.target.value)} 
              onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addMember(); } }}
              placeholder="@usuario" 
            />
            <Button type="button" variant="secondary" onClick={addMember}>Agregar</Button>
          </div>
          
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 bg-muted/50 p-4 rounded-xl">
              {members.map(m => (
                <div key={m} className="bg-background border px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                  {m}
                  <button type="button" onClick={() => removeMember(m)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" type="submit" isLoading={createMut.isPending}>Crear Reserva Compartida</Button>
      </form>
    </Modal>
  );
}
