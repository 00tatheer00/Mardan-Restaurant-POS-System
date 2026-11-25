"use client";

import { useActionState } from "react";
import { Flame, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInWithEmail, signInWithPin, type LoginState } from "./actions";

function LoginForm({ mode }: { mode: "email" | "pin" }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    mode === "email" ? signInWithEmail : signInWithPin,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      {mode === "email" ? (
        <>
          <Field id="email" label="Email" type="email" autoComplete="email" />
          <Field id="password" label="Password" type="password" autoComplete="current-password" />
        </>
      ) : (
        <>
          <Field id="username" label="Username" autoComplete="username" />
          <Field id="pin" label="4-digit PIN" type="password" inputMode="numeric" maxLength={4} pattern="\d{4}" className="text-center text-2xl tracking-[0.6em]" />
        </>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="bg-brand h-11 w-full text-base text-white hover:opacity-90">
        {pending && <Loader2 className="animate-spin" />}
        {mode === "email" ? "Sign in" : "Open POS"}
      </Button>
    </form>
  );
}

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} required className="h-11" {...props} />
    </div>
  );
}

export function LoginCard({ inactive }: { inactive: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-orange-50 via-slate-50 to-red-50 p-4 dark:from-slate-950 dark:via-background dark:to-slate-950">
      <Card className="w-full max-w-sm rounded-2xl shadow-xl">
        <CardHeader className="items-center text-center">
          <div className="bg-brand mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl text-white shadow-lg">
            <Flame className="size-7" />
          </div>
          <CardTitle className="text-2xl">Kabab House</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {inactive && <p className="mb-4 rounded-lg bg-destructive/10 p-2 text-center text-sm text-destructive">Account is disabled or not set up.</p>}
          <Tabs defaultValue="email">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="email"><Mail /> Email</TabsTrigger>
              <TabsTrigger value="pin"><KeyRound /> Cashier PIN</TabsTrigger>
            </TabsList>
            <TabsContent value="email"><LoginForm mode="email" /></TabsContent>
            <TabsContent value="pin"><LoginForm mode="pin" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
