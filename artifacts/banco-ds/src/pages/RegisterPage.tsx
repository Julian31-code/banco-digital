import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { extractError } from "@/lib/utils";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const regMut = useRegister();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    
    regMut.mutate({ data: { username, password, confirmPassword } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Error en el registro", description: extractError(err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-secondary rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl border p-8 sm:p-10 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-2xl font-display font-bold shadow-lg shadow-primary/25 mb-4">
            D$
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Creá tu cuenta</h1>
          <p className="text-muted-foreground mt-2 text-center">Unite al banco del futuro</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Usuario</label>
            <Input 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Elegí tu nombre de usuario" 
              minLength={3}
              maxLength={30}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Contraseña</label>
            <Input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Confirmar Contraseña</label>
            <Input 
              required 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="••••••••" 
            />
          </div>

          <Button type="submit" className="w-full mt-6" isLoading={regMut.isPending}>
            Registrarme
          </Button>
        </form>

        <p className="text-center mt-8 text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
            Iniciá sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
