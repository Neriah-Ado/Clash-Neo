import { useSyncExternalStore } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { toast } from "../lib/toast";

const icon = {
  info: Info,
  success: CheckCircle2,
  warn: TriangleAlert,
};

const tone = {
  info: "text-sky-600 dark:text-sky-300",
  success: "text-emerald-600 dark:text-emerald-300",
  warn: "text-amber-600 dark:text-amber-300",
};

export function ToastHost() {
  const items = useSyncExternalStore(toast.subscribe, toast.current, toast.current);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      {items.map((t) => {
        const Icon = icon[t.kind];
        return (
          <div
            key={t.id}
            onClick={() => toast.dismiss(t.id)}
            className="glass glass-soft glass-interactive pointer-events-auto
              flex items-center gap-3 px-4 py-3 text-sm cursor-pointer
              fade-rise"
            style={{ animationDuration: "0.35s" }}
          >
            <Icon size={16} className={`shrink-0 ${tone[t.kind]}`} />
            <span className="flex-1">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}
