import { FilePlus2 } from "lucide-react";

export default function EmptyState({ title, body }) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-ink/15 bg-white/55 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-mist text-ink">
          <FilePlus2 size={22} />
        </div>
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink/60">{body}</p>
      </div>
    </div>
  );
}
