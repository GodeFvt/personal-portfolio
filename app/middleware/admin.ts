export default defineNuxtRouteMiddleware(async () => {
  const { load, clear } = useAdminSession();
  try {
    await load();
  } catch {
    clear();
    return navigateTo("/admin/login");
  }
});
