import { useGetMe } from "@workspace/api-client-react";
import { formatDolar } from "@/lib/utils";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRightLeft, PiggyBank, Users, ShieldCheck, Crown } from "lucide-react";

export default function DashboardPage() {
  const { data: user } = useGetMe();

  const actions = [
    { title: "Transferir", desc: "Enviá dinero al instante", icon: <ArrowRightLeft className="w-7 h-7" />, path: "/transferir", color: "bg-blue-500/10 text-blue-600" },
    { title: "Mis Reservas", desc: "Ahorrá para tus metas", icon: <PiggyBank className="w-7 h-7" />, path: "/reservas", color: "bg-emerald-500/10 text-emerald-600" },
    { title: "Compartidas", desc: "Gastos en grupo", icon: <Users className="w-7 h-7" />, path: "/reservas", color: "bg-purple-500/10 text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#172554] rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl shadow-primary/20 border border-white/10"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <ShieldCheck className="w-64 h-64 -mt-20 -mr-20" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center min-h-[160px]">
          <div className="flex items-center gap-1.5 mb-1 text-yellow-300/90">
            <Crown className="w-3 h-3" />
            <span className="text-[11px] font-mono font-semibold tracking-tight">
              {parseFloat((user as any)?.legendaryJewel ?? "0").toFixed(5).replace(".", ",")}
            </span>
            <span className="text-[10px] text-yellow-200/60 uppercase tracking-wider">Joya Leg.</span>
          </div>
          <h2 className="text-white/70 font-medium tracking-widest uppercase text-sm mb-2">Saldo Disponible</h2>
          <div className="flex items-baseline gap-2">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight">
              {formatDolar(user?.balance)}
            </h1>
          </div>
          
          <div className="mt-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 w-max">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
             <span className="text-sm font-medium text-white/90">Cuenta Activa</span>
          </div>
        </div>
      </motion.div>

      <div>
        <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
          ¿Qué querés hacer hoy?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {actions.map((action, i) => (
            <motion.div 
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
            >
              <Link href={action.path} className="block group h-full">
                <div className="bg-card border rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col items-start gap-4">
                  <div className={`p-4 rounded-2xl ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                    {action.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{action.title}</h4>
                    <p className="text-muted-foreground text-sm mt-1">{action.desc}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
