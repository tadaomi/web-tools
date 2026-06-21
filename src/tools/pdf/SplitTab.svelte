<script>
  // PDF分割タブ。1つのPDFを範囲指定または全ページ個別で複数PDFへ分ける。
  import FileDropZone from './FileDropZone.svelte';
  import { fileToBytes, formatBytes, baseName, parseRanges } from './lib/fileutil.js';
  import { getPageCount, splitPdf, splitEachPage } from './lib/pdfio.js';
  import { downloadBytes, downloadAll } from './lib/download.js';

  // 受け取ったPDFのセッション状態（リロードで破棄。永続化しない）。
  let source = $state(null); // { name, bytes, pageCount }
  let mode = $state('ranges'); // 'ranges' | 'each'
  let rangeInput = $state('');
  let results = $state([]); // [{ bytes, pageCount, filename }]
  let busy = $state(false);
  let error = $state('');

  async function handleFiles(files) {
    error = '';
    results = [];
    const file = files[0];
    try {
      const bytes = await fileToBytes(file);
      const pageCount = await getPageCount(bytes);
      source = { name: file.name, bytes, pageCount };
      rangeInput = `1-${pageCount}`;
    } catch (e) {
      source = null;
      error = e.message ?? 'PDFを読み込めませんでした。';
    }
  }

  async function run() {
    if (!source || busy) return;
    error = '';
    results = [];
    busy = true;
    try {
      const base = baseName(source.name);
      let parts;
      if (mode === 'each') {
        parts = await splitEachPage(source.bytes);
      } else {
        const ranges = parseRanges(rangeInput, source.pageCount);
        parts = await splitPdf(source.bytes, ranges);
      }
      results = parts.map((p, i) => ({ ...p, filename: `${base}-${i + 1}.pdf` }));
    } catch (e) {
      error = e.message ?? '分割に失敗しました。';
    } finally {
      busy = false;
    }
  }

  function reset() {
    source = null;
    results = [];
    error = '';
    rangeInput = '';
  }
</script>

<div class="tab">
  {#if !source}
    <FileDropZone
      label="分割したいPDFをドラッグ＆ドロップ、またはクリックして選択"
      onfiles={handleFiles}
    />
  {:else}
    <div class="file-bar">
      <span class="file-name">{source.name}</span>
      <span class="file-meta">全 {source.pageCount} ページ</span>
      <button class="link-btn" onclick={reset} disabled={busy}>別のファイル</button>
    </div>

    <fieldset class="modes">
      <legend>分割方法</legend>
      <label>
        <input type="radio" bind:group={mode} value="ranges" />
        ページ範囲を指定
      </label>
      <label>
        <input type="radio" bind:group={mode} value="each" />
        全ページを1ページずつに分割（{source.pageCount} ファイル）
      </label>
    </fieldset>

    {#if mode === 'ranges'}
      <div class="range-field">
        <label for="range-input">ページ範囲（例: 1-3, 5, 8-10 ／ カンマ区切りで複数指定）</label>
        <input
          id="range-input"
          type="text"
          bind:value={rangeInput}
          placeholder="1-3, 5, 8-10"
          spellcheck="false"
          autocomplete="off"
        />
        <p class="note">各範囲が1つのPDFになります。</p>
      </div>
    {/if}

    <div class="actions">
      <button class="primary-btn" onclick={run} disabled={busy}>
        {busy ? '分割中…' : '分割を実行'}
      </button>
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if results.length > 0}
    <div class="results">
      <div class="results-head">
        <span>{results.length} 個のPDFを作成しました</span>
        <button class="primary-btn small" onclick={() => downloadAll(results)}>
          すべてダウンロード
        </button>
      </div>
      <ul>
        {#each results as r (r.filename)}
          <li>
            <span class="r-name">{r.filename}</span>
            <span class="r-meta">{r.pageCount} ページ ・ {formatBytes(r.bytes.length)}</span>
            <button class="link-btn" onclick={() => downloadBytes(r.bytes, r.filename)}>
              ダウンロード
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .file-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .file-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-meta {
    color: var(--text-muted);
    font-size: 0.85rem;
    flex: 1;
  }
  .modes {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .modes legend {
    font-weight: 600;
    padding: 0 0.4rem;
  }
  .modes label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  .range-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .range-field label {
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .range-field input {
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font);
    font-size: 1rem;
  }
  .range-field input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  .actions {
    display: flex;
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
  .link-btn {
    border: none;
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    font-family: var(--font);
    font-size: 0.85rem;
    padding: 0.2rem 0.4rem;
  }
  .link-btn:hover:not(:disabled) {
    text-decoration: underline;
  }
  .link-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-size: 0.9rem;
  }
  .results {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .results-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .results ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .results li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.9rem;
    border-bottom: 1px solid var(--border);
  }
  .results li:last-child {
    border-bottom: none;
  }
  .r-name {
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .r-meta {
    flex: 1;
    color: var(--text-muted);
    font-size: 0.82rem;
    white-space: nowrap;
  }
</style>
