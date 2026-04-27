<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen">
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <a href="/" class="text-lg font-semibold text-emerald-700">Happy News App</a>
      <nav class="flex gap-4 text-sm">
        <a class="hover:text-emerald-700" href="/">Home</a>
        <a class="hover:text-emerald-700" href="/onboarding">Onboarding</a>
        <a class="hover:text-emerald-700" href="/admin">Admin</a>
      </nav>
    </div>
  </header>
  <main class="mx-auto max-w-5xl px-4 py-6">
    <slot />
  </main>
</div>
