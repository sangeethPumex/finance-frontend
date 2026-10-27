/** Title and optional subtitle on the left, a trailing value on the right. Put rows in a divided list. */
export function ListRow({ title, subtitle, trailing, leading }: { title: React.ReactNode; subtitle?: React.ReactNode; trailing?: React.ReactNode; leading?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="num shrink-0 font-medium">{trailing}</span>}
    </li>
  );
}

export const RowList = ({ children }: { children: React.ReactNode }) => <ul className="divide-y divide-line-soft">{children}</ul>;
