<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function formatPublishedDate(publishedAt: string | null, fetchedAt: string) {
    const dateValue = publishedAt ?? fetchedAt;
    const parsed = new Date(dateValue);

    if (Number.isNaN(parsed.getTime())) {
      return 'Date unavailable';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(parsed);
  }
</script>

<section class="space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-bold">Today’s Happy News</h1>
    <p class="text-slate-600">
      Pick one article, read it on the original site, and come back later to rate how happy it made you.
    </p>
  </header>

  {#if data.dbError}
    <div class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
      {data.dbError}
    </div>
  {:else if data.userError}
    <div class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
      {data.userError}
    </div>
  {:else if data.items.length === 0}
    <div class="rounded-lg border border-slate-200 bg-white p-4 text-slate-700">
      No classified happy news is available yet. Add RSS feeds and import classification JSON from the admin page.
    </div>
  {:else}
    <div class="grid gap-4 md:grid-cols-3">
      {#each data.items as item}
        <article class="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div class="space-y-2">
            <h2 class="text-lg font-semibold leading-snug">{item.title}</h2>
            <p class="text-sm text-slate-600">Source: {item.sourceName}</p>
            <p class="text-sm text-slate-500">Published: {formatPublishedDate(item.publishedAt, item.fetchedAt)}</p>
          </div>

          <a
            class="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read original article
          </a>
        </article>
      {/each}
    </div>
  {/if}
</section>
