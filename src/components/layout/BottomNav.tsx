import { BriefcaseBusiness, Settings2, SlidersHorizontal, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

const navItems = [
  { to: '/ofertas', label: 'Ofertas', icon: BriefcaseBusiness },
  { to: '/fuentes', label: 'Fuentes', icon: SlidersHorizontal },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
  { to: '/ajustes', label: 'Ajustes', icon: Settings2 },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-2 py-3 text-[0.625rem] font-semibold tracking-widest uppercase transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
