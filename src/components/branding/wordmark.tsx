import Image from "next/image";
import { BRAND_IMAGES } from "@/config/brand";

type WordmarkProps = {
  compact?: boolean;
};

export function Wordmark({ compact = false }: WordmarkProps) {
  const mark = compact ? 22 : 28;

  return (
    <div className="flex items-center gap-2">
      <Image
        src={BRAND_IMAGES.mark}
        alt=""
        width={mark}
        height={mark}
        className="rounded-lg"
      />
      <div className="flex items-baseline gap-1.5 tracking-[0.18em]">
        <span className="text-[11px] font-semibold text-accent">IEM</span>
        <span
          className={`font-semibold text-foreground ${compact ? "text-sm" : "text-lg sm:text-xl"}`}
        >
          SYNC
        </span>
      </div>
    </div>
  );
}
