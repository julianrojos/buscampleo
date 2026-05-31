import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import StatusIndicator from '@/components/layout/StatusIndicator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth/session';
import { shouldRequireAuth } from '@/lib/runtime';
import useJobFilters from '@/hooks/use-job-filters';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/ofertas', label: 'Ofertas' },
  { to: '/fuentes', label: 'Fuentes' },
  { to: '/criterios', label: 'Criterios' },
  { to: '/perfil', label: 'Perfil' },
  { to: '/emails', label: 'Emails' },
  { to: '/historial', label: 'Historial' },
];

export default function TopBar() {
  const { filters, setFilter } = useJobFilters();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const showSearch = pathname.startsWith('/ofertas');
  const searchId = 'topbar-search';

  return (
    <header className="border-b border-border bg-background">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <NavLink
            to="/ofertas"
            className="font-heading text-lg font-semibold tracking-wide uppercase"
          >
            Buscampleo
          </NavLink>
          <div className="lg:hidden">
            <StatusIndicator />
          </div>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-none border border-transparent px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors',
                  'hover:border-border hover:bg-muted',
                  isActive && 'border-border bg-muted text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {showSearch ? (
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <label htmlFor={searchId} className="sr-only">
                Buscar ofertas
              </label>
              <Search className="pointer-events-none absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={searchId}
                type="search"
                value={filters.query}
                onChange={(event) => setFilter('query', event.target.value)}
                placeholder="Buscar ofertas..."
                className="pl-5"
              />
            </div>
            <div className="hidden lg:flex">
              <StatusIndicator />
            </div>
            {shouldRequireAuth() && session?.user ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
                  navigate('/login', { replace: true });
                }}
              >
                <LogOut className="size-3.5" />
                Salir
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="hidden lg:flex lg:justify-end">
            <StatusIndicator />
          </div>
        )}
      </div>
    </header>
  );
}
