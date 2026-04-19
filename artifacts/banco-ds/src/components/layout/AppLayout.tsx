import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRightLeft, PiggyBank, User, LogOut, LayoutDashboard, History, Building2, MapPin, Pickaxe } from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [_, setLocation] = useLocation();
  const logoutMut = useLogout();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const handleLogout = () => {
    logoutMut.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLogoutModalOpen(false);
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { name: "Inicio", path: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Transferir", path: "/transferir", icon: <ArrowRightLeft className="w-5 h-5" /> },
    { name: "Reservas", path: "/reservas", icon: <PiggyBank className="w-5 h-5" /> },
    { name: "Movimientos", path: "/movimientos", icon: <History className="w-5 h-5" /> },
    { name: "Propiedades", path: "/propiedades", icon: <Building2 className="w-5 h-5" /> },
    { name: "Mis Propiedades", path: "/mis-propiedades", icon: <MapPin className="w-5 h-5" /> },
    { name: "Minar", path: "/minar", icon: <Pickaxe className="w-5 h-5" /> },
    { name: "Perfil", path: "/perfil", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col relative bg-background transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-2xl tracking-tight text-foreground flex items-center gap-3 cursor-pointer group">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-xl shadow-md group-hover:shadow-primary/30 transition-all duration-300 group-hover:scale-105">
             D$
           </div>
           Banco D$
        </Link>
        <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2 text-foreground hover:bg-muted rounded-full transition-colors active:scale-95">
          <Menu className="w-7 h-7" />
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setMenuOpen(false)} 
            />
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="relative w-80 bg-card h-full shadow-2xl flex flex-col border-l"
            >
              <div className="p-6 flex items-center justify-between border-b border-border/50">
                <Link href="/perfil" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 group cursor-pointer">
                   {user?.avatarUrl ? (
                     <img src={user.avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-border shadow-sm group-hover:border-primary transition-colors" />
                   ) : (
                     <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display text-lg uppercase group-hover:bg-primary/20 transition-colors">
                       {user?.username?.[0] || 'U'}
                     </div>
                   )}
                   <div>
                     <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hola,</p>
                     <span className="font-bold text-lg leading-none group-hover:text-primary transition-colors">{user?.username}</span>
                   </div>
                </Link>
                <button onClick={() => setMenuOpen(false)} className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
                  <X className="w-6 h-6"/>
                </button>
              </div>
              
              <div className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
                {navItems.map(item => (
                  <Link 
                    key={item.path} 
                    href={item.path} 
                    onClick={() => setMenuOpen(false)} 
                    className="flex items-center gap-4 px-4 py-3.5 text-foreground hover:bg-secondary rounded-2xl font-semibold transition-all duration-200 group"
                  >
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      {item.icon}
                    </div>
                    {item.name}
                  </Link>
                ))}
              </div>
              
              <div className="p-6 border-t border-border/50">
                <button 
                  onClick={() => { setMenuOpen(false); setLogoutModalOpen(true); }} 
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground w-full rounded-2xl font-bold transition-all duration-300"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>

      <Modal isOpen={logoutModalOpen} onClose={() => setLogoutModalOpen(false)} title="¿Cerrar sesión?">
        <p className="text-muted-foreground mb-8 text-lg">¿Estás seguro que querés cerrar sesión en tu cuenta de Banco D$?</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="w-full" onClick={() => setLogoutModalOpen(false)}>Cancelar</Button>
          <Button variant="destructive" className="w-full" onClick={handleLogout} isLoading={logoutMut.isPending}>
            Sí, cerrar sesión
          </Button>
        </div>
      </Modal>
    </div>
  );
}
