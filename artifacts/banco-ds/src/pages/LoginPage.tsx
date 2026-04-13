import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { extractError } from "@/lib/utils";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const loginMut = useLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMut.mutate({ data: { username, password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Error al iniciar sesión", description: extractError(err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl border p-8 sm:p-10 relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-3xl font-display font-bold shadow-lg shadow-primary/25 mb-6">
            D$
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Bienvenido</h1>
          <p className="text-muted-foreground mt-2 text-center">Ingresá tus datos para acceder a tu banco</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1 text-foreground">Usuario</label>
            <Input 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="@usuario" 
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full mt-4" isLoading={loginMut.isPending}>
            Iniciar sesión
          </Button>
        </form>

        <p className="text-center mt-8 text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
            Registrate acá
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
