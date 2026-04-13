import { Loader2 } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <span className="font-display font-bold text-2xl">D$</span>
        </div>
        <div className="absolute -inset-2 border-2 border-primary border-t-transparent rounded-3xl animate-spin"></div>
      </div>
      <p className="text-muted-foreground font-medium animate-pulse">Cargando tu banco...</p>
    </div>
  );
}
