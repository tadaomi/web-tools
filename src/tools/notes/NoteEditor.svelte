<script>
  import { touchActive, deriveTitle } from './notes.svelte.js';

  let { note } = $props();

  // マウント時に本文へフォーカスし、カーソルを末尾へ置く。
  // （HTMLの autofocus 属性は a11y 警告のため使わず action で行う）
  function focusOnMount(node) {
    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }
</script>

<div class="editor-fields">
  <!-- 手動タイトル。未入力時は本文1行目から導出した文字列を placeholder に出す。 -->
  <input
    class="title-input"
    bind:value={note.title}
    oninput={touchActive}
    placeholder={deriveTitle(note.content)}
    aria-label="タイトル"
    spellcheck="false"
    autocomplete="off"
  />

  <textarea
    class="editor"
    use:focusOnMount
    bind:value={note.content}
    oninput={touchActive}
    placeholder="ここに入力…"
    spellcheck="false"
    autocomplete="off"
  ></textarea>
</div>

<style>
  /* タイトル input と本文 textarea を縦に積む。高さは親（.editor-wrap）から受け取る。 */
  .editor-fields {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .title-input {
    border: none;
    outline: none;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font);
    font-size: 1.15rem;
    font-weight: 600;
    padding: 1rem 1.5rem 0.5rem;
  }
  .title-input::placeholder {
    color: var(--text-muted);
    font-weight: 600;
  }
  .editor {
    flex: 1; /* 残りの高さを本文が占有 */
    min-height: 0;
    width: 100%;
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
