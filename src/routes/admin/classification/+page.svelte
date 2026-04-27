<script lang="ts">
  import {
    buildClassificationPrompt,
    MAX_CLASSIFICATION_SELECTION,
    type ClassificationPromptNewsItem
  } from '$lib/classification/buildPrompt';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let selectedIds = $state(new Set<number>());
  let generatedPrompt = $state('');
  let uiMessage = $state('');

  function toggleSelection(newsId: number): void {
    const next = new Set(selectedIds);

    if (next.has(newsId)) {
      next.delete(newsId);
      uiMessage = '';
    } else if (next.size >= MAX_CLASSIFICATION_SELECTION) {
      uiMessage = `選択できる件数は最大${MAX_CLASSIFICATION_SELECTION}件です。`;
      return;
    } else {
      next.add(newsId);
      uiMessage = '';
    }

    selectedIds = next;
  }

  function selectAllVisible(): void {
    const visibleItemIds = data.items.map((item) => item.id);
    selectedIds = new Set(visibleItemIds.slice(0, MAX_CLASSIFICATION_SELECTION));
    uiMessage =
      visibleItemIds.length > MAX_CLASSIFICATION_SELECTION
        ? `表示中の先頭${MAX_CLASSIFICATION_SELECTION}件を選択しました。`
        : '';
  }

  function clearSelection(): void {
    selectedIds = new Set();
    generatedPrompt = '';
    uiMessage = '';
  }

  function generatePrompt(): void {
    if (selectedIds.size === 0) {
      generatedPrompt = '';
      uiMessage = 'プロンプト生成にはニュースを1件以上選択してください。';
      return;
    }

    if (selectedIds.size > MAX_CLASSIFICATION_SELECTION) {
      generatedPrompt = '';
      uiMessage = `選択できる件数は最大${MAX_CLASSIFICATION_SELECTION}件です。`;
      return;
    }

    const selectedItems: ClassificationPromptNewsItem[] = data.items
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        sourceName: item.sourceName,
        publishedAt: item.publishedAt,
        description: item.description,
        language: item.language,
        country: item.country
      }));

    generatedPrompt = buildClassificationPrompt(selectedItems);
    uiMessage = `プロンプトを生成しました（${selectedItems.length}件）。`;
  }

  async function copyPrompt(): Promise<void> {
    if (!generatedPrompt) {
      uiMessage = '先にプロンプトを生成してください。';
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedPrompt);
      uiMessage = 'プロンプトをクリップボードにコピーしました。';
    } catch {
      uiMessage = 'コピーに失敗しました。テキストエリアから手動でコピーしてください。';
    }
  }

  function shortText(value: string | null, length = 120): string {
    if (!value) {
      return '-';
    }

    return value.length > length ? `${value.slice(0, length)}...` : value;
  }
</script>

<section class="space-y-6">
  <div class="space-y-2">
    <h2 class="text-xl font-semibold">Classification Workflow</h2>
    <p class="text-sm text-slate-600">
      Admin保護は後続タスクで強化予定です。このページは管理者がChatGPTブラウザで手動分類するためのプロンプト生成専用です。
    </p>
    <p class="text-sm text-slate-600">
      未分類ニュースを最大{MAX_CLASSIFICATION_SELECTION}件選択し、日本語プロンプトを生成できます（JSON取り込みは未実装）。
    </p>
  </div>

  {#if data.dbError}
    <div class="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{data.dbError}</div>
  {:else}
    <div class="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <p>選択数: <span class="font-semibold">{selectedIds.size}</span> / {MAX_CLASSIFICATION_SELECTION}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          onclick={selectAllVisible}
          type="button"
        >
          表示中を選択（最大{MAX_CLASSIFICATION_SELECTION}件）
        </button>
        <button
          class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          onclick={clearSelection}
          type="button"
        >
          選択をクリア
        </button>
        <button
          class="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          onclick={generatePrompt}
          type="button"
        >
          プロンプト生成
        </button>
        <button
          class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          onclick={copyPrompt}
          type="button"
        >
          コピー
        </button>
      </div>
    </div>

    {#if uiMessage}
      <div class="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">{uiMessage}</div>
    {/if}

    {#if data.items.length === 0}
      <p class="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        未分類ニュースはありません。
      </p>
    {:else}
      <div class="overflow-x-auto rounded border border-slate-200 bg-white">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th class="px-3 py-2">Select</th>
              <th class="px-3 py-2">ID</th>
              <th class="px-3 py-2">Title / RSS description</th>
              <th class="px-3 py-2">Source</th>
              <th class="px-3 py-2">Published</th>
              <th class="px-3 py-2">Fetched</th>
              <th class="px-3 py-2">Lang / Country</th>
              <th class="px-3 py-2">URL</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 align-top">
            {#each data.items as item}
              <tr>
                <td class="px-3 py-2">
                  <input
                    aria-label={`ニュースID ${item.id} を選択`}
                    checked={selectedIds.has(item.id)}
                    onchange={() => toggleSelection(item.id)}
                    type="checkbox"
                  />
                </td>
                <td class="px-3 py-2 text-xs text-slate-600">{item.id}</td>
                <td class="max-w-md px-3 py-2">
                  <p class="font-medium text-slate-900">{item.title}</p>
                  <p class="mt-1 text-xs text-slate-600">RSS description: {shortText(item.description)}</p>
                </td>
                <td class="px-3 py-2">{item.sourceName}</td>
                <td class="px-3 py-2">{item.publishedAt ?? '-'}</td>
                <td class="px-3 py-2">{item.fetchedAt}</td>
                <td class="px-3 py-2">{item.language} / {item.country}</td>
                <td class="px-3 py-2">
                  <a class="text-blue-700 underline" href={item.url} rel="noopener noreferrer" target="_blank">Open</a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <section class="space-y-2 rounded border border-slate-200 bg-white p-4">
      <h3 id="generated-chatgpt-prompt-label" class="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Generated ChatGPT Prompt
      </h3>
      <textarea
        class="h-96 w-full rounded border border-slate-300 p-2 font-mono text-xs"
        aria-labelledby="generated-chatgpt-prompt-label"
        readonly
        value={generatedPrompt}
      ></textarea>
    </section>
  {/if}
</section>
