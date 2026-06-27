import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await signIn(email, password); setBusy(false);
    if (error) toast({ title: "Erro no login", description: error, variant: "destructive" });
    else nav("/");
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await signUp(email, password, nome); setBusy(false);
    if (error) toast({ title: "Erro no cadastro", description: error, variant: "destructive" });
    else toast({ title: "Cadastro realizado", description: "Verifique seu e-mail se a confirmação estiver ativada, ou faça login." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>EDR — Acesso</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 pt-4">
                <div><Label>E-mail</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
                <div><Label>Senha</Label><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy?"Entrando...":"Entrar"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 pt-4">
                <div><Label>Nome</Label><Input required value={nome} onChange={e=>setNome(e.target.value)} /></div>
                <div><Label>E-mail</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
                <div><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy?"Cadastrando...":"Cadastrar"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}