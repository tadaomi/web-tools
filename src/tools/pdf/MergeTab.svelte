<script>
  // PDF結合タブ。複数PDFを並び替えて1つのPDFにまとめる。
  import FileDropZone from './FileDropZone.svelte';
  import { fileToBytes, formatBytes } from './lib/fileutil.js';
  import { getPageCount, mergePdfs } from './lib/pdfio.js';
  import { downloadBytes } from './lib/download.js';

  // 結合対象リスト（並び順 = 結合順）。セッション状態。
  let items = $state([]); // [{ id, name, bytes, pageCount, size }]
  let result = $state(null); // { bytes, pageCount }
  let busy = $state(false);
  let error = $state('');

  async function handleFiles(files) {
    error = '';
    result = null;
    for (const file of files) {
      try {
        const bytes = await fileToBytes(file);
        const pageCount = await getPageCount(bytes);
        items.push({
          id: crypto.randomUUID(),
          name: file.name,
          bytes,
          pageCount,
          size: bytes.length,
        });
      } catch (e) {
        error = `「${file.name}」: ${e.message ?? 'を読み込めませんでした。'}`;
      }
    }
  }

  function move(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= items.length) return;
    const [moved] = items.splice(index, 1);
    items.splice(next, 0, moved);
  }

  function remove(index) {
    items.splice(index, 1);
    result = null;
  }

  async function run() {
    if (items.length < 2 || busy) return;
    error = '';
    result = null;
    busy = true;
    try {
      result = await mergePdfs(items.map((it) => it.bytes));
    } catch (e) {
      error = e.message ?? '結合に失敗しました。';
    } finally {
      busy = false;
    }
  }

  const totalPages = $derived(items.reduce((sum, it) => sum + it.pageCount, 0));
</script>

<div class="tab">
  <FileDropZone
    multiple
    label="結合したいPDFをドラッグ＆ドロップ、またはクリックして選択"
    onfiles={handleFiles}
  />

  {#if items.length > 0}
    <div class="list">
      <div class="list-head">
        <span>{items.length} ファイル ・ 合計 {totalPages} ページ</span>
      </div>
      <ul>
        {#each items as it, i (it.id)}
          <li>
            <span class="order">{i + 1}</span>
            <span class="i-name">{it.name}</span>
            <span class="i-meta">{it.pageCount}p ・ {formatBytes(it.size)}</span>
            <span class="i-actions">
              <button
                class="icon-btn"
                onclick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="上へ">↑</button
              >
              <button
                class="icon-btn"
                onclick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="下へ">↓</button
              >
              <button class="icon-btn danger" onclick={() => remove(i)} aria-label="削除">×</button>
            </span>
          </li>
        {/each}
      </ul>
    </div>

    <div class="actions">
      <button class="primary-btn" onclick={run} disabled={busy || items.length < 2}>
        {busy ? '結合中…' : '結合を実行'}
      </button>
      {#if items.length < 2}
        <span class="hint">結合には2ファイル以上が必要です。</span>
      {/if}
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if result}
    <div class="result-card">
      <div>
        <strong>結合が完了しました</strong>
        <span class="r-meta">{result.pageCount} ページ ・ {formatBytes(result.bytes.length)}</span>
      </div>
      <button class="primary-btn small" onclick={() => downloadBytes(result.bytes, 'merged.pdf')}>
        merged.pdf をダウンロード
      </button>
    </div>
  {/if}
</div>

<style>
  .tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .list {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .list-head {
    padding: 0.6rem 0.9rem;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .list ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .list li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.9rem;
    border-bottom: 1px solid var(--border);
  }
  .list li:last-child {
    border-bottom: none;
  }
  .order {
    flex-shrink: 0;
    width: 1.6rem;
    height: 1.6rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 50%;
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .i-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9rem;
  }
  .i-meta {
    color: var(--text-muted);
    font-size: 0.8rem;
    white-space: nowrap;
  }
  .i-actions {
    display: flex;
    gap: 0.2rem;
    flex-shrink: 0;
  }
  .icon-btn {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 6px;
    width: 1.7rem;
    height: 1.7rem;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    color: var(--text);
  }
  .icon-btn:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .icon-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .icon-btn.danger:hover {
    border-color: var(--danger);
    color: var(--danger);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .hint {
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  .primary-btn {
    border: none;
    background: var(--accent);
    color: var(--accent-contrast);
    border-radius: 8px;
    padding: 0.6rem 1.2rem;
    font-family: var(--font);
    font-size: 0.95rem;
    cursor: pointer;
    transition: opacity 0.12s ease;
  }
  .primary-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  .primary-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .primary-btn.small {
    padding: 0.45rem 1rem;
    font-size: 0.85rem;
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-size: 0.9rem;
  }
  .result-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.9rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .result-card > div {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .r-meta {
    color: var(--text-muted);
    font-size: 0.82rem;
  }
</style>
