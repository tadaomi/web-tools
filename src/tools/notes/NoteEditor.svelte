<script>
  import { touchActive } from './notes.svelte.js';

  let { note } = $props();

  // マウント時に本文へフォーカスし、カーソルを末尾へ置く。
  // （HTMLの autofocus 属性は a11y 警告のため使わず action で行う）
  function focusOnMount(node) {
    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }
</script>

<textarea
  class="editor"
  use:focusOnMount
  bind:value={note.content}
  oninput={touchActive}
  placeholder="ここに入力…（1行目がタイトルになります）"
  spellcheck="false"
  autocomplete="off"
></textarea>

<style>
  .editor {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    padding: 1.25rem 1.5rem;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font);
    font-size: 1rem;
    line-height: 1.7;
  }
</style>
