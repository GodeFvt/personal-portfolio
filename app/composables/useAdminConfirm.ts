import type { InjectionKey, Ref } from "vue";

export interface AdminConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

interface AdminConfirmState extends Required<AdminConfirmOptions> {
  open: boolean;
}

type AdminConfirmRequest = (options: AdminConfirmOptions) => Promise<boolean>;

const adminConfirmKey: InjectionKey<AdminConfirmRequest> = Symbol("admin-confirm");

export function provideAdminConfirm() {
  const state = ref<AdminConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    tone: "default",
  });
  let resolvePending: ((confirmed: boolean) => void) | null = null;

  function settle(confirmed: boolean) {
    state.value.open = false;
    resolvePending?.(confirmed);
    resolvePending = null;
  }

  const request: AdminConfirmRequest = (options) => {
    if (resolvePending) settle(false);
    state.value = {
      open: true,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? "Confirm",
      cancelLabel: options.cancelLabel ?? "Cancel",
      tone: options.tone ?? "default",
    };
    return new Promise<boolean>((resolve) => { resolvePending = resolve; });
  };

  provide(adminConfirmKey, request);
  onBeforeUnmount(() => settle(false));

  return { state: state as Readonly<Ref<AdminConfirmState>>, confirm: () => settle(true), cancel: () => settle(false) };
}

export function useAdminConfirm() {
  const request = inject(adminConfirmKey);
  if (!request) throw new Error("Admin confirmation provider is unavailable.");
  return request;
}
