<script>
  // 共通のファイル受け取り領域。ドラッグ&ドロップとクリック選択の両対応。
  // PDF以外は弾き、multiple=false のときは先頭1件のみ採用する。
  let {
    accept = '.pdf',
    multiple = false,
    label = 'PDFをドラッグ＆ドロップ、またはクリックして選択',
    onfiles,
  } = $props();

  let dragging = $state(false);
  let inputEl;

  // .pdf のみを通すフィルタ（MIMEと拡張子の両方で判定）。
  function filterPdf(fileList) {
    return Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name),
    );
  }

  function emit(fileList) {
    let files = filterPdf(fileList);
    if (files.length === 0) return;
    if (!multiple) files = files.slice(0, 1);
    onfiles?.(files);
  }

  function handleInput(e) {
    emit(e.target.files);
    // 同じファイルを連続選択しても change が発火するようリセットする。
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer?.files) emit(e.dataTransfer.files);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputEl.click();
    }
  }
</script>

<div
  class="dropzone"
  class:dragging
  role="button"
  tabindex="0"
  onclick={() => inputEl.click()}
  onkeydown={handleKeydown}
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={handleDrop}
>
  <span class="icon" aria-hidden="true">📄</span>
  <span class="label">{label}</span>
  {#if multiple}
    <span class="hint">複数選択できます</span>
  {/if}
  <input
    bind:this={inputEl}
    type="file"
    {accept}
    {multiple}
    onchange={handleInput}
    aria-label={label}
  />
</div>

<style>
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2.5rem 1.5rem;
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text-muted);
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
  }
  .dropzone:hover,
  .dropzone:focus-visible {
    border-color: var(--accent);
    outline: none;
  }
  .dropzone.dragging {
    border-color: var(--accent);
    background: var(--surface);
  }
  .icon {
    font-size: 2rem;
  }
  .label {
    font-size: 0.95rem;
  }
  .hint {
    font-size: 0.8rem;
    opacity: 0.8;
  }
  input[type='file'] {
    display: none;
  }
</style>
