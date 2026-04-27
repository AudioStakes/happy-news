<script lang="ts">
  import { NEWS_STATUSES } from '$lib/constants/classification';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  const countLabels: Array<{ key: keyof PageData['counts']; label: string; status?: (typeof NEWS_STATUSES)[number] }> =
    [
      { key: 'all', label: 'All' },
      { key: 'unclassified', label: 'Unclassified', status: 'unclassified' },
      { key: 'candidate', label: 'Candidate', status: 'candidate' },
      { key: 'rejected', label: 'Rejected', status: 'rejected' },
      { key: 'archived', label: 'Archived', status: 'archived' }
    ];

  function buildQuery(status?: string, page = 1): string {
    const params = new URLSearchParams();

    if (data.filters.q) {
      params.set('q', data.filters.q);
    }
    if (status) {
      params.set('status', status);
    }
    if (page > 1) {
      params.set('page', String(page));
    }

    const query = params.toString();
    return query ? `?${query}` : '?';
  }

  function shortText(value: string | null, length = 140): string {
    if (!value) {
      return '-';
    }

    return value.length > length ? `${value.slice(0, length)}...` : value;
  }
</script>

<section class="space-y-6">
  <div class="space-y-2">
    <h2 class="text-xl font-semibold">Fetched News List</h2>
    <p class="text-sm text-slate-600">Admin protection will be added in a later task.</p>
  </div>

  {#if data.dbError}
    <div class="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{data.dbError}</div>
  {/if}

  {#if data.filters.statusError}
    <div class="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {data.filters.statusError}
    </div>
  {/if}

  {#if form?.message}
    <div
      class={`rounded border px-3 py-2 text-sm ${form.success
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
        : 'border-rose-300 bg-rose-50 text-rose-700'}`}
    >
      <p>{form.message}</p>
    </div>
  {/if}

  <form class="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto_auto]" method="GET">
    <label class="space-y-1 text-sm">
      <span class="font-medium text-slate-700">Search title or source</span>
      <input
        class="w-full rounded border border-slate-300 px-2 py-1"
        name="q"
        placeholder="keyword"
        value={data.filters.q}
      />
    </label>

    <label class="space-y-1 text-sm">
      <span class="font-medium text-slate-700">Status</span>
      <select class="rounded border border-slate-300 px-2 py-1" name="status">
        <option value="">All</option>
        {#each NEWS_STATUSES as status}
          <option selected={data.filters.status === status} value={status}>{status}</option>
        {/each}
      </select>
    </label>

    <div class="flex items-end gap-2">
      <button class="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700" type="submit"
        >Apply</button
      >
      <a class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50" href="/admin/news">Reset</a>
    </div>
  </form>

  <section class="rounded border border-slate-200 bg-white p-4">
    <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Counts</h3>
    <div class="flex flex-wrap gap-2 text-sm">
      {#each countLabels as item}
        <a
          class={`rounded border px-2 py-1 ${data.filters.status === item.status || (!data.filters.status && !item.status)
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          href={buildQuery(item.status)}
        >
          {item.label}: {data.counts[item.key]}
        </a>
      {/each}
    </div>
  </section>

  {#if data.items.length === 0}
    <p class="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
      No fetched RSS metadata matched your filters.
    </p>
  {:else}
    <div class="overflow-x-auto rounded border border-slate-200 bg-white">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th class="px-3 py-2">ID</th>
            <th class="px-3 py-2">Title / RSS description</th>
            <th class="px-3 py-2">Source</th>
            <th class="px-3 py-2">Feed</th>
            <th class="px-3 py-2">Published</th>
            <th class="px-3 py-2">Fetched</th>
            <th class="px-3 py-2">Lang / Country</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 align-top">
          {#each data.items as item}
            <tr>
              <td class="px-3 py-2 text-xs text-slate-600">{item.id}</td>
              <td class="max-w-md px-3 py-2">
                <p class="font-medium text-slate-900">{item.title}</p>
                <p class="mt-1 text-xs text-slate-600">RSS description: {shortText(item.description)}</p>
                <a class="mt-1 inline-block text-xs text-blue-700 underline" href={item.url} rel="noreferrer" target="_blank"
                  >Open original article</a
                >
              </td>
              <td class="px-3 py-2">{item.sourceName}</td>
              <td class="px-3 py-2">{item.rssFeedName ?? '-'}</td>
              <td class="px-3 py-2">{item.publishedAt ?? '-'}</td>
              <td class="px-3 py-2">{item.fetchedAt}</td>
              <td class="px-3 py-2">{item.language} / {item.country}</td>
              <td class="px-3 py-2">
                <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{item.status}</span>
              </td>
              <td class="px-3 py-2">
                <form method="POST" action="?/toggleArchived">
                  <input name="news_id" type="hidden" value={item.id} />
                  <button class="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" type="submit">
                    {item.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between text-sm">
      <a
        class={`rounded border px-3 py-1 ${data.pagination.hasPrev
          ? 'border-slate-300 bg-white hover:bg-slate-50'
          : 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'}`}
        href={buildQuery(data.filters.status ?? undefined, data.pagination.page - 1)}
      >
        Previous
      </a>
      <span class="text-slate-600">Page {data.pagination.page}</span>
      <a
        class={`rounded border px-3 py-1 ${data.pagination.hasNext
          ? 'border-slate-300 bg-white hover:bg-slate-50'
          : 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'}`}
        href={buildQuery(data.filters.status ?? undefined, data.pagination.page + 1)}
      >
        Next
      </a>
    </div>
  {/if}
</section>
