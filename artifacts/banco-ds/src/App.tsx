import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BgThemeProvider } from "@/contexts/BgThemeContext";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import TransferPage from "@/pages/TransferPage";
import ReservesPage from "@/pages/ReservesPage";
import PersonalReservePage from "@/pages/PersonalReservePage";
import SharedReservePage from "@/pages/SharedReservePage";
import ProfilePage from "@/pages/ProfilePage";
import TransactionsPage from "@/pages/TransactionsPage";
import PropiedadesPage from "@/pages/PropiedadesPage";
import MisPropiedadesPage from "@/pages/MisPropiedadesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function MainApp() {
  return (
    <AuthGuard>
      <AppLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/transferir" component={TransferPage} />
          <Route path="/reservas" component={ReservesPage} />
          <Route path="/reservas/personal/:id" component={PersonalReservePage} />
          <Route path="/reservas/compartida/:id" component={SharedReservePage} />
          <Route path="/movimientos" component={TransactionsPage} />
          <Route path="/propiedades" component={PropiedadesPage} />
          <Route path="/mis-propiedades" component={MisPropiedadesPage} />
          <Route path="/perfil" component={ProfilePage} />
          <Route>
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>
              <h2 className="text-2xl font-bold mb-2">Página no encontrada</h2>
              <p className="text-muted-foreground mb-8">No pudimos encontrar lo que estabas buscando.</p>
            </div>
          </Route>
        </Switch>
      </AppLayout>
    </AuthGuard>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BgThemeProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route component={MainApp} />
            </Switch>
          </WouterRouter>
        </BgThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
