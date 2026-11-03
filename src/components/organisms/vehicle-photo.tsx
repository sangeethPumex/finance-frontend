import { cn } from "@/lib/cn";
import { vehicleFileUrl, type Vehicle } from "@/lib/api";
import { vehicleIcon } from "./vehicle-forms";

/** The number plate as it looks on the road: white, black border, wide monospace letters. */
export function Plate({ plate, size = "md" }: { plate: string; size?: "sm" | "md" }) {
  return (
    <span className={cn("num inline-flex items-center gap-1.5 rounded-[5px] border-2 border-ink bg-white font-bold uppercase tracking-[0.12em] text-ink shadow-[inset_0_0_0_1px_white,0_1px_2px_rgba(0,0,0,.12)]", size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-[15px]")}>
      <span className={cn("rounded-[2px] bg-[#1f4fa3] px-0.5 font-sans font-semibold text-white", size === "sm" ? "text-[7px]" : "text-[9px]")}>IND</span>{plate}
    </span>
  );
}

/**
 * The vehicle large on a soft stage: a transparent PNG (a 3D render or a cut-out photo) floats over a spotlight with a ground shadow.
 * Without a photo, the car or bike icon stands in.
 */
export function VehiclePhoto({ v, className }: { v: Pick<Vehicle, "id" | "kind" | "name" | "photo">; className?: string }) {
  const I = vehicleIcon(v.kind);
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,var(--color-surface)_0%,var(--color-tint)_75%)]", className)}>
      <div className="absolute inset-x-[15%] bottom-[10%] h-[9%] rounded-[50%] bg-black/25 blur-xl" aria-hidden />
      {v.photo
        ? <img src={vehicleFileUrl(v.id, "photo", v.photo)} alt={v.name} className="relative max-h-[88%] max-w-[90%] object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.28)]" />
        : <I size={120} weight="duotone" className="relative text-faint" aria-label={v.name} />}
    </div>
  );
}
