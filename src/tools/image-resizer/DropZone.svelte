<script>
  // ZIP と画像の受け取り領域。ドラッグ&ドロップとクリック選択の両対応。
  // 種類の判定（ZIP 1つ / 画像のみ）は呼び出し側の classifyFiles で行う。
  let { disabled = false, onfiles } = $props();

  let dragging = $state(false);
  let inputEl;

  const ACCEPT = '.zip,.jpg,.jpeg,.png,.webp,.gif,.bmp,application/zip';

  function emit(fileList) {
    const files = Array.from(fileList ?? []);
    if (files.length > 0) onfiles?.(files);
  }

  function open() {
    if (!disabled) inputEl.click();
  }

  function handleInput(e) {
    emit(e.target.files);
    // 同じファイルを続けて選んでも change が発火するようリセットする。
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dragging = false;
    if (!disabled) emit(e.dataTransfer?.files);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  }
</script>

<div
  class="dropzone"
  class:dragging
  class:disabled
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-disabled={disabled}
  onclick={open}
  onkeydown={handleKeydown}
  ondragover={(e) => {
    e.preventDefault();
    if (!disabled) dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={handleDrop}
>
  <span class="icon" aria-hidden="true">🖼️</span>
  <span class="label">ZIP または画像をドラッグ＆ドロップ、またはクリックして選択</span>
  <span class="hint">ZIP は1つ、画像は複数まとめて選べます（JPEG / PNG / WebP / GIF / BMP）</span>
  <input
    bind:this={inputEl}
    type="file"
    accept={ACCEPT}
    multiple
    onchange={handleInput}
    aria-label="ZIPまたは画像を選択"
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
  .dropzone.disabled {
    opacity: 0.5;
    cursor: default;
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
