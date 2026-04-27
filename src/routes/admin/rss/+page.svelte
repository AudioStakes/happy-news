<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form?: ActionData } = $props();
</script>

<section class="space-y-6">
  <div class="space-y-2">
    <h2 class="text-xl font-semibold">RSS Feed Management</h2>
    <p class="text-sm text-slate-600">Admin protection will be added in a later task.</p>
  </div>

  {#if data.dbError}
    <div class="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{data.dbError}</div>
  {/if}

  {#if form?.message}
    <div
      class={`rounded border px-3 py-2 text-sm ${form.ingestResult?.errors?.length
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}
    >
      <p>{form.message}</p>
    </div>
  {/if}

  <form method="POST" action="?/addFeed" class="space-y-3 rounded border border-slate-200 bg-white p-4">
    <h3 class="text-base font-semibold">Add RSS Feed</h3>

    <div class="grid gap-3 md:grid-cols-2">
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">Name *</span>
        <input class="w-full rounded border border-slate-300 px-2 py-1" name="name" required />
      </label>

      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">Source name *</span>
        <input class="w-full rounded border border-slate-300 px-2 py-1" name="source_name" required />
      </label>

      <label class="space-y-1 text-sm md:col-span-2">
        <span class="font-medium text-slate-700">Feed URL *</span>
        <input class="w-full rounded border border-slate-300 px-2 py-1" name="url" required />
      </label>

      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">Language</span>
        <input class="w-full rounded border border-slate-300 px-2 py-1" name="language" value="ja" />
      </label>

      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">Country</span>
        <input class="w-full rounded border border-slate-300 px-2 py-1" name="country" value="JP" />
      </label>

      <label class="space-y-1 text-sm md:col-span-2">
        <span class="font-medium text-slate-700">Default category</span>
        <input class="w-full rounded border border-slate-300 px-2 py-1" name="default_category" />
      </label>
    </div>

    <button class="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700" type="submit"
      >Add feed</button
    >
  </form>

  {#if form?.ingestResult}
    <section class="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
      <h3 class="font-semibold">Latest ingestion result (feed #{form.ingestResult.feedId})</h3>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        <li>Fetched: {form.ingestResult.fetched}</li>
        <li>Inserted: {form.ingestResult.inserted}</li>
        <li>Skipped duplicates: {form.ingestResult.skippedDuplicates}</li>
        <li>Skipped invalid: {form.ingestResult.skippedInvalid}</li>
      </ul>

      {#if form.ingestResult.errors.length > 0}
        <p class="mt-3 font-medium text-amber-700">Errors</p>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-amber-700">
          {#each form.ingestResult.errors as error}
            <li>{error}</li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  <section class="space-y-3">
    <h3 class="text-base font-semibold">Registered feeds</h3>

    {#if data.feeds.length === 0}
      <p class="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        No feeds registered yet.
      </p>
    {:else}
      <div class="overflow-x-auto rounded border border-slate-200 bg-white">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th class="px-3 py-2">Name</th>
              <th class="px-3 py-2">URL</th>
              <th class="px-3 py-2">Source</th>
              <th class="px-3 py-2">Language / Country</th>
              <th class="px-3 py-2">Category</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Last fetched</th>
              <th class="px-3 py-2">Created</th>
              <th class="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each data.feeds as feed}
              <tr>
                <td class="px-3 py-2 font-medium">{feed.name}</td>
                <td class="max-w-sm px-3 py-2">
                  <a class="text-blue-700 underline" href={feed.url} rel="noreferrer" target="_blank">{feed.url}</a>
                </td>
                <td class="px-3 py-2">{feed.sourceName}</td>
                <td class="px-3 py-2">{feed.language} / {feed.country}</td>
                <td class="px-3 py-2">{feed.defaultCategory ?? '-'}</td>
                <td class="px-3 py-2">
                  {#if feed.isActive}
                    <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
                  {:else}
                    <span class="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">Inactive</span>
                  {/if}
                </td>
                <td class="px-3 py-2">{feed.lastFetchedAt ?? '-'}</td>
                <td class="px-3 py-2">{feed.createdAt}</td>
                <td class="px-3 py-2">
                  <div class="flex flex-wrap gap-2">
                    <form method="POST" action="?/toggleFeed">
                      <input name="feed_id" type="hidden" value={feed.id} />
                      <button class="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" type="submit">
                        {feed.isActive ? 'Set inactive' : 'Set active'}
                      </button>
                    </form>

                    <form method="POST" action="?/ingestFeed">
                      <input name="feed_id" type="hidden" value={feed.id} />
                      <button
                        class="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!feed.isActive}
                        type="submit"
                      >
                        Ingest now
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</section>
