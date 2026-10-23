export interface ToastItem {
  id: number;
  text: string;
  kind: "info" | "success" | "warn";
}

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
  for (const fn of listeners) fn(items);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  push(text: string, kind: ToastItem["kind"] = "info") {
    const item: ToastItem = { id: ++seq, text, kind };
    items = [...items.slice(-3), item];
    emit();
    setTimeout(() => dismiss(item.id), 4600);
  },
  dismiss,
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(items);
    return () => listeners.delete(fn);
  },
  current: () => items,
};
