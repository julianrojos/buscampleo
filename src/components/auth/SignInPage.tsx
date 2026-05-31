import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signInWithOtp, useSession } from '@/lib/auth/session';
import { getAllowedEmail, shouldRequireAuth } from '@/lib/runtime';

export default function SignInPage() {
  const [email, setEmail] = useState(getAllowedEmail());
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user && shouldRequireAuth()) {
      const from = (location.state as { readonly from?: string } | null)?.from ?? '/ofertas';
      navigate(from, { replace: true });
    }
  }, [location.state, navigate, session?.user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage(null);

    try {
      await signInWithOtp(email.trim());
      setStatus('sent');
      setMessage('Revisa tu correo para abrir el enlace de acceso.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-none border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Acceso privado
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
            Entrar en Buscampleo
          </h1>
          <p className="text-sm text-muted-foreground">
            Usa tu email autorizado para recibir el enlace de acceso.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label htmlFor="signin-email" className="space-y-2 text-sm">
            <span className="block text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Email
            </span>
            <Input
              id="signin-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={getAllowedEmail() || 'tu@email.com'}
            />
          </label>

          <Button type="submit" className="w-full" disabled={status === 'sending'}>
            {status === 'sending' ? 'Enviando...' : 'Enviar enlace'}
          </Button>
        </form>

        {message ? (
          <p
            className={status === 'error' ? 'text-sm text-danger' : 'text-sm text-muted-foreground'}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
