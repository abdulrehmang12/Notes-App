export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-lg font-black text-paper shadow-soft">
        L
      </div>
      {!compact && (
        <div>
          <p className="text-base font-extrabold leading-tight tracking-normal text-ink">Lumina Notes</p>
          <p className="text-xs font-medium text-ink/55">Collaborative writing studio</p>
        </div>
      )}
    </div>
  );
}
