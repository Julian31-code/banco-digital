import { useState } from "react";
import { motion } from "framer-motion";
import { useCreateTransfer, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { extractError, parseAmount } from "@/lib/utils";
import { Send, ArrowRightLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TransferPage() {
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const transMut = useCreateTransfer();
  const [_, setLocation] = useLocation();

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !amount) return;

    transMut.mutate({ data: { toUsername: username, amount: parseAmount(amount) } }, {
      onSuccess: (res) => {
        toast({ title: "Transferencia Exitosa", description: res.message });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setUsername("");
        setAmount("");
        setTimeout(() => setLocation("/"), 1500);
      },
      onError: (err) => {
        toast({ title: "No se pudo transferir", description: extractError(err), variant: "destructive" });
      }
    });
  };

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
        <p className="text-muted-foreground mb-8">Enviá D$ de forma segura y al instante.</p>
        
        <form onSubmit={handleTransfer} className="space-y-6 relative z-10">
           <div>
             <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Destinatario</label>
             <Input 
               required 
               value={username} 
               onChange={e => setUsername(e.target.value)} 
               placeholder="Nombre de usuario" 
               className="text-lg"
             />
           </div>
           
           <div>
             <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Monto</label>
             <div className="bg-muted/60 rounded-2xl px-5 py-4 mb-4 flex items-baseline gap-2">
               <span className="text-muted-foreground font-bold text-xl">D$</span>
               <span className="font-mono text-4xl font-bold text-foreground tracking-tight flex-1">
                 {amount || <span className="text-muted-foreground/50">0</span>}
               </span>
             </div>
             <NumericKeyboard value={amount} onChange={setAmount} />
           </div>
           
           <Button type="submit" className="w-full py-4 text-lg mt-4" isLoading={transMut.isPending} disabled={!username || !amount}>
              {transMut.isPending ? "Procesando..." : "Confirmar Transferencia"}
           </Button>
        </form>
      </motion.div>
    </div>
  );
}
