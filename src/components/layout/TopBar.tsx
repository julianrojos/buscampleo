import { NavLink, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';

import StatusIndicator from '@/components/layout/StatusIndicator';
import { Input } from '@/components/ui/input';
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
  const showSearch = pathname.startsWith('/ofertas');

  return (
    <header className="border-b border-border bg-background">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <NavLink to="/ofertas" className="font-heading text-lg font-semibold tracking-wide uppercase">
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
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar ofertas"
                type="search"
                value={filters.query}
                onChange={(event) => setFilter('query', event.target.value)}
                placeholder="Buscar ofertas..."
                className="pl-5"
              />
            </label>
            <div className="hidden lg:flex">
              <StatusIndicator />
            </div>
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
