<script>
  // 画像リサイズツールのメイン。ZIP 1つ、または画像を複数受け取り、設定に従って一括リサイズする。
  // すべての処理はブラウザ内で完結し、画像はサーバーに送信されない。
  import { onDestroy } from 'svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import DropZone from './DropZone.svelte';
  import ResultGallery from './ResultGallery.svelte';
  import { resizerSettings } from './imageResizer.svelte.js';
  import { effectiveSettings } from './lib/settings.js';
  import { classifyFiles } from './lib/input.js';
  import { readZip, buildZip } from './lib/zipio.js';
  import { processAll } from './lib/process.js';
  import { resizeImage } from './lib/resize.js';
  import { zipOutputName, splitPath } from './lib/naming.js';
  import { formatBytes } from './lib/format.js';
  import { downloadBlob } from './lib/download.js';

  // 入力（再処理に使うため元データを保持）。大きなバイト列を含むため $state.raw で持つ。
  let source = $state.raw(null); // { label, zipName, entries: [{ path, bytes }], skipped }
  let results = $state.raw([]); // processAll の戻り値。成功には url（プレビュー用）を追加
  let lastRun = $state.raw(null); // 最後に処理したときの effectiveSettings
  let busy = $state(false);
  let zipping = $state(false);
  let error = $state('');
  let progress = $state({ current: 0, total: 0 });

  const current = $derived(effectiveSettings(resizerSettings));
  const stale = $derived(
    source !== null &&
      lastRun !== null &&
      !busy &&
      !zipping &&
      JSON.stringify(current) !== JSON.stringify(lastRun),
  );
  const succeeded = $derived(results.filter((r) => r.ok));
  const failedCount = $derived(results.length - succeeded.length);
  const totalSrc = $derived(succeeded.reduce((sum, r) => sum + r.srcSize, 0));
  const totalOut = $derived(succeeded.reduce((sum, r) => sum + r.outSize, 0));
  const progressPct = $derived(
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0,
  );
  // 処理中・ZIP作成中は、結果や入力を入れ替える操作をすべて止める。
  const locked = $derived(busy || zipping);

  // プレビュー用の Object URL を解放する。
  function revokeUrls(list) {
    for (const r of list) if (r.url) URL.revokeObjectURL(r.url);
  }

  function clearResults() {
    revokeUrls(results);
    results = [];
    lastRun = null;
  }

  // 画面を離れたときもプレビュー用の URL を解放する。
  onDestroy(() => revokeUrls(results));

  async function handleFiles(files) {
    if (busy) return;
    error = '';
    const picked = classifyFiles(files);
    if (picked.kind === 'error') {
      error = picked.message;
      return;
    }

    busy = true;
    try {
      let next;
      if (picked.kind === 'zip') {
        const bytes = new Uint8Array(await picked.file.arrayBuffer());
        const { entries, skipped } = await readZip(bytes);
        next = { label: picked.file.name, zipName: picked.file.name, entries, skipped };
      } else {
        const entries = await Promise.all(
          picked.files.map(async (f) => ({
            path: f.name,
            bytes: new Uint8Array(await f.arrayBuffer()),
          })),
        );
        const label =
          picked.files.length === 1 ? picked.files[0].name : `画像 ${picked.files.length} 枚`;
        next = { label, zipName: null, entries, skipped: 0 };
      }
      if (next.entries.length === 0) {
        error = `処理できる画像が見つかりませんでした（除外 ${next.skipped} 件）。`;
        return;
      }
      clearResults();
      source = next;
    } catch (e) {
      error = e?.message || 'ファイルを読み込めませんでした。';
      return;
    } finally {
      busy = false;
    }
    await run();
  }

  async function run() {
    if (!source || busy || zipping) return;
    busy = true;
    error = '';
    clearResults();
    // 処理中は設定パネルを無効にしているため、開始時の値で最後まで処理される。
    const settings = current;
    progress = { current: 0, total: source.entries.length };
    try {
      const items = await processAll(source.entries, settings, {
        resize: resizeImage,
        onProgress: (c, t) => (progress = { current: c, total: t }),
      });
      results = items.map((r) => (r.ok ? { ...r, url: URL.createObjectURL(r.blob) } : r));
      lastRun = settings;
    } catch (e) {
      error = e?.message || 'リサイズに失敗しました。';
    } finally {
      busy = false;
    }
  }

  function reset() {
    if (busy || zipping) return;
    clearResults();
    source = null;
    error = '';
    progress = { current: 0, total: 0 };
  }

  async function downloadZip() {
    if (busy || zipping || succeeded.length === 0) return;
    zipping = true;
    error = '';
    // await の後で source / lastRun を読まないよう、対象とファイル名を先に確定させる。
    const files = succeeded.map((r) => ({ path: r.outPath, blob: r.blob }));
    const filename = zipOutputName(source.zipName, lastRun.size);
    try {
      const bytes = await buildZip(files);
      downloadBlob(new Blob([bytes], { type: 'application/zip' }), filename);
    } catch {
      error = 'ZIPの作成に失敗しました。';
    } finally {
      zipping = false;
    }
  }

  function saveOne(item) {
    downloadBlob(item.blob, splitPath(item.outPath).name);
  }
</script>

<section class="resizer">
  <header class="head">
    <h1>画像リサイズ</h1>
    <p class="privacy">🔒 すべてブラウザ内で処理されます。画像はサーバーに送信されません。</p>
  </header>

  <details class="guide">
    <summary>使い方</summary>
    <ol>
      <li>
        <strong>設定</strong>: 基準サイズ（既定
        170px）と向きごとのルールを確認します。設定は自動で保存されるので、次回からは不要です。
      </li>
      <li>
        <strong>投入</strong>: ZIP
        を1つ、または画像を複数ドロップすると、すぐにリサイズが始まります。
      </li>
      <li>
        <strong>保存</strong>: 結果を確認して「ZIPをダウンロード」。1枚ずつ保存することもできます。
      </li>
    </ol>
    <dl>
      <dt>横幅 / 高さに合わせる</dt>
      <dd>その辺を基準サイズにし、もう一方は縦横比を保って計算します。</dd>
      <dt>長辺 / 短辺に合わせる</dt>
      <dd>長い方（短い方）の辺を基準サイズにします。</dd>
      <dt>中央で正方形に切り抜く</dt>
      <dd>画像の中央を正方形に切り抜き、基準×基準にします。</dd>
      <dt>小さい画像は拡大しない</dt>
      <dd>オンにすると、基準より小さい画像は拡大せず、元のサイズのまま出力します。</dd>
    </dl>
    <p>設定を変えたあとは「再処理」を押せば、ファイルを入れ直さずに作り直せます。</p>
  </details>

  <SettingsPanel disabled={locked} />

  {#if source}
    <div class="file-bar">
      <span class="file-name" title={source.label}>{source.label}</span>
      <span class="file-meta">
        画像 {source.entries.length} 件{#if source.skipped > 0}（除外 {source.skipped} 件）{/if}
      </span>
      <button class="link-btn" onclick={reset} disabled={locked}>別のファイル</button>
    </div>
  {:else}
    <DropZone disabled={busy} onfiles={handleFiles} />
    {#if busy}
      <p class="status">読み込み中…</p>
    {/if}
  {/if}

  {#if busy && progress.total > 0}
    <div class="progress">
      <div class="progress-bar">
        <div class="progress-fill" style:width="{progressPct}%"></div>
      </div>
      <span class="progress-label">{progress.current} / {progress.total} 枚</span>
    </div>
  {/if}

  {#if stale}
    <div class="stale">
      <span>設定が変更されました。</span>
      <button class="primary-btn small" onclick={run}>再処理</button>
    </div>
  {/if}

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if results.length > 0}
    <div class="result-head">
      <div class="result-info">
        <strong>
          成功 {succeeded.length} 件
          {#if failedCount > 0}
            / <span class="failed">失敗 {failedCount} 件</span>
          {/if}
        </strong>
        {#if succeeded.length > 0}
          <span class="r-meta">{formatBytes(totalSrc)} → {formatBytes(totalOut)}</span>
        {/if}
      </div>
      <button
        class="primary-btn"
        onclick={downloadZip}
        disabled={busy || zipping || succeeded.length === 0}
      >
        {zipping ? 'ZIPを作成中…' : 'ZIPをダウンロード'}
      </button>
    </div>
    <ResultGallery {results} onsave={saveOne} />
  {/if}
</section>

<style>
  .resizer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
  }
  .head h1 {
    margin: 0 0 0.4rem;
    font-size: 1.6rem;
  }
  .privacy {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .guide {
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .guide summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 600;
  }
  .guide ol {
    margin: 0.6rem 0;
    padding-left: 1.3rem;
  }
  .guide dl {
    margin: 0.6rem 0;
  }
  .guide dt {
    color: var(--text);
    font-weight: 600;
  }
  .guide dd {
    margin: 0 0 0.4rem;
  }
  .guide p {
    margin: 0.4rem 0 0;
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
    flex: 1;
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .status {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .progress-bar {
    flex: 1;
    height: 8px;
    background: var(--surface-2);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.15s ease;
  }
  .progress-label {
    font-size: 0.82rem;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .stale {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    font-size: 0.9rem;
  }
  .result-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .result-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .failed {
    color: var(--danger);
  }
  .r-meta {
    color: var(--text-muted);
    font-size: 0.85rem;
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
</style>
