import type { Icon } from "@phosphor-icons/react";
import { Divider, IconTile } from "../atoms";

/** Page title: light 36px with a short rule beneath, like a label divider. */
export function PageHeader({ title, icon, description, action }: { title: string; icon?: Icon; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        {icon && <IconTile icon={icon} variant="solid" size="lg" className="mt-0.5" />}
        <div>
          <h1 className="text-[30px] font-semibold leading-[1.2] tracking-tight">{title}</h1>
          <Divider variant="accent" className="mt-4" />
          {description && <p className="mt-3 max-w-[520px] text-[13px] text-sub">{description}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
