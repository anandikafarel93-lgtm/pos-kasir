import type { FC, ReactNode } from 'react';
import { List } from '@phosphor-icons/react';

interface TopBarProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  onOpenMobileSidebar?: () => void;
}

export const TopBar: FC<TopBarProps> = ({
  title,
  subtitle,
  actions,
  onOpenMobileSidebar,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 md:py-4 flex items-center justify-between shrink-0 gap-3">
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            title="Buka Menu"
          >
            <List size={22} weight="bold" />
          </button>
        )}

        <div>
          <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-[11px] md:text-xs text-slate-500 mt-0.5 line-clamp-1">
            {subtitle}
          </p>
        </div>
      </div>

      {actions && <div className="flex items-center gap-2 md:gap-3">{actions}</div>}
    </header>
  );
};