export default defineNuxtRouteMiddleware(async () => {
  const { load, clear } = useAdminSession();

  try {
    await load();
    return navigateTo("/admin");
  } catch {
    clear();
  }
});
