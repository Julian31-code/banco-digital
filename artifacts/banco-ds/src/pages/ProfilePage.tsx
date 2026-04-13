import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  useGetMe, useGetReserves, useGetSharedReserves,
  useUpdateProfile, useChangePassword, useDeleteAccount,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { extractError } from "@/lib/utils";
import { User, KeyRound, AlertTriangle, Trash2, Camera, Loader2, Palette } from "lucide-react";
import { useLocation } from "wouter";
import { useBgTheme, BG_STYLES, type BgTheme } from "@/contexts/BgThemeContext";

function resizeImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { data: user } = useGetMe();
  const { data: personalReserves } = useGetReserves();
  const { data: sharedReserves } = useGetSharedReserves();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const profileMut = useUpdateProfile();
  const pwMut = useChangePassword();
  const delMut = useDeleteAccount();

  const [delStep, setDelStep] = useState(0);
  const [delPw, setDelPw] = useState("");
  const { theme, setTheme } = useBgTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAvatarUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      profileMut.mutate({ data: { avatarUrl: dataUrl } }, {
        onSuccess: () => {
          toast({ title: "Foto actualizada" });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" }),
        onSettled: () => setAvatarUploading(false),
      });
    } catch {
      toast({ title: "No se pudo leer la imagen", variant: "destructive" });
      setAvatarUploading(false);
    }
  }, [profileMut, queryClient, toast]);

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    pwMut.mutate({ data: { currentPassword: curPw, newPassword: newPw, confirmNewPassword: confPw } }, {
      onSuccess: () => {
        toast({ title: "Contraseña actualizada exitosamente" });
        setCurPw(""); setNewPw(""); setConfPw("");
      },
      onError: err => toast({ title: "Error", description: extractError(err), variant: "destructive" })
    });
  };

  const handleDeleteAccount = () => {
    delMut.mutate({ data: { password: delPw } }, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
      },
      onError: err => toast({ title: "No se pudo eliminar", description: extractError(err), variant: "destructive" })
    });
  };

  const balance = parseFloat(user?.balance || "0");
  const hasPersonalReserves = (personalReserves?.length ?? 0) > 0;
  const hasSharedReserves = (sharedReserves?.length ?? 0) > 0;
  const canDelete = balance === 0 && !hasPersonalReserves && !hasSharedReserves;

  const deleteBlockReasons: string[] = [];
  if (balance > 0) deleteBlockReasons.push("saldo mayor a D$ 0");
  if (hasPersonalReserves) deleteBlockReasons.push("reservas personales activas");
  if (hasSharedReserves) deleteBlockReasons.push("reservas compartidas activas");

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <h1 className="text-4xl font-display font-bold text-foreground">Tu Perfil</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl p-8 shadow-sm border border-border/60">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><User className="w-5 h-5 text-primary" /> Información Personal</h2>
        
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="relative group focus:outline-none"
              title="Cambiar foto de perfil"
            >
              <div className="w-32 h-32 rounded-[2rem] bg-muted border-4 border-card shadow-lg flex items-center justify-center font-display font-bold text-4xl uppercase overflow-hidden">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                  : user?.username?.[0] || 'U'
                }
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-[2rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {avatarUploading
                  ? <Loader2 className="w-8 h-8 text-white animate-spin" />
                  : <Camera className="w-8 h-8 text-white" />
                }
              </div>
            </button>
            <p className="text-xs text-muted-foreground font-medium text-center">Tocá para cambiar la foto</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="block text-sm font-semibold mb-2 ml-1 text-muted-foreground">Nombre de Usuario (No modificable)</label>
              <Input disabled value={user?.username || ""} className="bg-muted text-muted-foreground opacity-70" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Apariencia ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-3xl p-8 shadow-sm border border-border/60">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><Palette className="w-5 h-5 text-primary" /> Apariencia</h2>
        <p className="text-sm text-muted-foreground mb-4">Color de fondo de la aplicación.</p>
        <div className="flex gap-3 flex-wrap">
          {(Object.entries(BG_STYLES) as [BgTheme, { bg: string; label: string }][]).map(([key, { bg, label }]) => {
            const isActive = theme === key;
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all duration-200"
                style={{
                  borderColor: isActive ? "hsl(var(--primary))" : "hsl(var(--border))",
                  background: isActive ? "hsl(var(--primary)/0.1)" : "hsl(var(--secondary))",
                  color: isActive ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                  style={{
                    background: bg,
                    borderColor: isActive ? "hsl(var(--primary))" : "hsl(var(--border))",
                  }}
                />
                {label}
                {isActive && <span className="text-xs opacity-70">✓</span>}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Seguridad ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-3xl p-8 shadow-sm border border-border/60">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><KeyRound className="w-5 h-5 text-primary" /> Seguridad</h2>
        <form onSubmit={handleChangePw} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1">Contraseña Actual</label>
            <Input required type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1">Nueva Contraseña</label>
            <Input required type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 ml-1">Confirmar Nueva Contraseña</label>
            <Input required type="password" value={confPw} onChange={e => setConfPw(e.target.value)} placeholder="••••••••" minLength={6} />
          </div>
          <Button type="submit" variant="secondary" isLoading={pwMut.isPending} className="mt-4 w-full">Cambiar contraseña</Button>
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-destructive/5 rounded-3xl p-8 border border-destructive/20">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-destructive"><Trash2 className="w-5 h-5" /> Zona de Peligro</h2>
        <p className="text-muted-foreground mb-2">Para eliminar tu cuenta necesitás:</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground mb-6 space-y-1">
          <li className={balance === 0 ? "text-green-600 dark:text-green-400 font-medium" : ""}>Saldo D$ 0,00000</li>
          <li className={!hasPersonalReserves ? "text-green-600 dark:text-green-400 font-medium" : ""}>Sin reservas personales</li>
          <li className={!hasSharedReserves ? "text-green-600 dark:text-green-400 font-medium" : ""}>Sin reservas compartidas</li>
        </ul>
        {!canDelete && deleteBlockReasons.length > 0 && (
          <p className="text-sm text-destructive/80 font-medium mb-4 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Tenés {deleteBlockReasons.join(", ")}.
          </p>
        )}
        <Button
          variant="destructive"
          onClick={() => setDelStep(1)}
          disabled={!canDelete}
          className="disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Eliminar cuenta
        </Button>
      </motion.div>

      <Modal isOpen={delStep > 0} onClose={() => { setDelStep(0); setDelPw(""); }} title="Eliminar cuenta">
        {delStep === 1 && (
          <div className="space-y-6">
            <div className="bg-destructive/10 p-4 rounded-xl flex gap-3 text-destructive font-medium">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <p>¿Estás completamente seguro? Esta acción es irreversible y no se puede deshacer.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDelStep(0)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => setDelStep(2)}>Sí, quiero continuar</Button>
            </div>
          </div>
        )}
        {delStep === 2 && (
          <div className="space-y-6">
            <p className="text-muted-foreground text-lg">Para confirmar tu identidad, ingresá tu contraseña.</p>
            <Input type="password" value={delPw} onChange={e => setDelPw(e.target.value)} placeholder="Contraseña actual" />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDelStep(0)}>Cancelar</Button>
              <Button variant="primary" disabled={!delPw} onClick={() => setDelStep(3)}>Verificar</Button>
            </div>
          </div>
        )}
        {delStep === 3 && (
          <div className="space-y-6">
            <div className="bg-black text-white p-6 rounded-2xl border-2 border-destructive shadow-xl">
              <h3 className="font-bold text-xl text-destructive mb-2 uppercase">¡Última Advertencia!</h3>
              <p className="opacity-90">Estás a un solo click de borrar toda tu cuenta. Si presionás eliminar, se terminó.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDelStep(0)}>Me arrepentí</Button>
              <Button variant="destructive" isLoading={delMut.isPending} onClick={handleDeleteAccount}>ELIMINAR DEFINITIVAMENTE</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
