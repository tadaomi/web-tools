<script>
  // PDF圧縮タブ。各ページを画像として再描画し、品質・解像度を落として再構成する。
  import FileDropZone from './FileDropZone.svelte';
  import { fileToBytes, formatBytes, baseName, reductionPercent } from './lib/fileutil.js';
  import { compressPdf } from './lib/compress.js';
  import { downloadBytes } from './lib/download.js';
  import { compressSettings } from './pdf.svelte.js';

  let source = $state(null); // { name, bytes, size }
  let result = $state(null); // { bytes, size, filename }
  let busy = $state(false);
  let error = $state('');
  let progress = $state({ current: 0, total: 0 });

  // 解像度スケールの選択肢（小さいほど低解像度=小サイズ）。
  const scaleOptions = [
    { value: 0.75, label: '低解像度（最小サイズ）' },
    { value: 1.0, label: '標準' },
    { value: 1.5, label: '高解像度（高品質）' },
  ];

  async function handleFiles(files) {
    error = '';
    result = null;
    const file = files[0];
    try {
      const bytes = await fileToBytes(file);
      source = { name: file.name, bytes, size: bytes.length };
    } catch (e) {
      source = null;
      error = e.message ?? 'PDFを読み込めませんでした。';
    }
  }

  async function run() {
    if (!source || busy) return;
    error = '';
    result = null;
    progress = { current: 0, total: 0 };
    busy = true;
    // 圧縮中に reset() で source が null になっても完了時に参照しないよう、
    // await の前に必要な値（元サイズ・出力ファイル名）を退避しておく。
    const srcBytes = source.bytes;
    const srcSize = source.size;
    const outName = `${baseName(source.name)}-compressed.pdf`;
    try {
      const bytes = await compressPdf(srcBytes, {
        quality: compressSettings.quality,
        scale: compressSettings.scale,
        onProgress: (current, total) => (progress = { current, total }),
      });
      result = {
        bytes,
        size: bytes.length,
        origSize: srcSize,
        filename: outName,
      };
    } catch (e) {
      error = e.message ?? '圧縮に失敗しました。';
    } finally {
      busy = false;
    }
  }

  function reset() {
    source = null;
    result = null;
    error = '';
    progress = { current: 0, total: 0 };
  }

  // result に退避済みの origSize を使う（圧縮中に source が消えても安全）。
  const reduction = $derived(result ? reductionPercent(result.origSize, result.size) : 0);
  const grew = $derived(result ? result.size >= result.origSize : false);
  const progressPct = $derived(
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0,
  );
</script>

<div class="tab">
  <p class="info">
    各ページを画像として再描画し、解像度・品質を落として圧縮します。<strong
      >画像を多く含むPDF（スキャン文書など）に有効</strong
    >です。テキスト主体のPDFでは効果が小さく、テキストは画像化されコピー・検索ができなくなります（内容によってはサイズが増えることもあります）。
  </p>

  {#if !source}
    <FileDropZone
      label="圧縮したいPDFをドラッグ＆ドロップ、またはクリックして選択"
      onfiles={handleFiles}
    />
  {:else}
    <div class="file-bar">
      <span class="file-name">{source.name}</span>
      <span class="file-meta">元サイズ {formatBytes(source.size)}</span>
      <button class="link-btn" onclick={reset} disabled={busy}>別のファイル</button>
    </div>

    <div class="settings">
      <div class="setting">
        <label for="quality">画質（JPEG品質）: {Math.round(compressSettings.quality * 100)}%</label>
        <input
          id="quality"
          type="range"
          min="0.3"
          max="0.95"
          step="0.05"
          bind:value={compressSettings.quality}
          disabled={busy}
        />
      </div>
      <div class="setting">
        <label for="scale">解像度</label>
        <select id="scale" bind:value={compressSettings.scale} disabled={busy}>
          {#each scaleOptions as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="primary-btn" onclick={run} disabled={busy}>
        {busy ? '圧縮中…' : '圧縮を実行'}
      </button>
    </div>

    {#if busy && progress.total > 0}
      <div class="progress">
        <div class="progress-bar">
          <div class="progress-fill" style:width="{progressPct}%"></div>
        </div>
        <span class="progress-label">{progress.current} / {progress.total} ページ</span>
      </div>
    {/if}
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if result}
    <div class="result-card" class:warn={grew}>
      <div class="result-info">
        {#if grew}
          <strong>圧縮できませんでした</strong>
          <span class="r-meta">
            {formatBytes(result.origSize)} → {formatBytes(result.size)}（サイズが増えました）
          </span>
          <span class="r-note">
            このPDFはテキスト主体のため、画像化すると逆に大きくなります。元のファイルをそのままお使いください。
          </span>
        {:else}
          <strong>圧縮が完了しました</strong>
          <span class="r-meta">
            {formatBytes(result.origSize)} → {formatBytes(result.size)}（−{reduction}%）
          </span>
        {/if}
      </div>
      <button
        class="primary-btn small"
        onclick={() => downloadBytes(result.bytes, result.filename)}
      >
        ダウンロード
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
  .info {
    margin: 0;
    padding: 0.75rem 0.9rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.6;
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
    white-space: nowrap;
  }
  .settings {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .setting {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 200px;
    flex: 1;
  }
  .setting label {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .setting input[type='range'] {
    accent-color: var(--accent);
  }
  .setting select {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font);
    font-size: 0.95rem;
  }
  .actions {
    display: flex;
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
  .result-card.warn {
    border-color: var(--danger);
  }
  .result-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .r-meta {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .r-note {
    color: var(--danger);
    font-size: 0.8rem;
  }
</style>
