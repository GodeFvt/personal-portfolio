import type { PublicProject } from "~~/shared/types/portfolio-api";
import { createPortfolioApi } from "~/lib/api/portfolio";

export function usePortfolioProjectDialog(onError: (message: string) => void) {
  const api = createPortfolioApi(useNuxtApp().$api);
  const dialog = ref<HTMLDialogElement>();
  const selectedProject = ref<PublicProject | null>(null);

  function setDialog(element: unknown) {
    dialog.value = element instanceof HTMLDialogElement ? element : undefined;
  }

  async function inspect(slug: string) {
    try {
      selectedProject.value = (await api.project(slug)).data;
      await nextTick();
      dialog.value?.showModal();
    } catch {
      onError("Project details could not be loaded.");
    }
  }

  return reactive({
    selectedProject,
    inspect,
    props: computed(() => ({ dialog: dialog.value, setDialog })),
  });
}
