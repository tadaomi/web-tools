<script>
  import { notesState, deleteNote, displayTitle } from './notes.svelte.js';

  let { onselect, oncreate } = $props();

  function handleDelete(id) {
    // localStorageのみ＝誤削除のコストが高いため確認する。
    if (confirm('このメモを削除しますか？')) {
      deleteNote(id);
    }
  }

  // 同日なら時刻、それ以外は月/日を表示する簡易フォーマット。
  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    if (d.toDateString() === now.toDateString()) {
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  // 一覧用の本文プレビュー（タイトル行＝1行目を除いた残り）。
  function snippet(content) {
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.slice(1).join(' ') || '追加のテキストなし';
  }
</script>

<div class="list-header">
  <span class="list-title">メモ</span>
  <button class="new-btn" onclick={oncreate}>＋ 新規</button>
</div>

<div class="search-bar">
  <input
    class="search-input"
    type="search"
    bind:value={notesState.query}
    placeholder="メモを検索…"
    aria-label="メモを検索"
    spellcheck="false"
    autocomplete="off"
  />
  {#if notesState.query}
    <button
      class="search-clear"
      onclick={() => (notesState.query = '')}
      aria-label="検索をクリア"
      title="クリア">×</button
    >
  {/if}
</div>

<ul class="note-list">
  {#each notesState.filteredSorted as note (note.id)}
    <li class="note-row" class:active={note.id === notesState.activeId}>
      <button class="note-item" onclick={() => onselect(note.id)}>
        <span class="note-title">{displayTitle(note)}</span>
        <span class="note-sub">
          <span class="note-date">{formatDate(note.updatedAt)}</span>
          <span class="note-snippet">{snippet(note.content)}</span>
        </span>
      </button>
      <button
        class="delete-btn"
        onclick={() => handleDelete(note.id)}
        aria-label="削除"
        title="削除">×</button
      >
    </li>
  {:else}
    <li class="note-empty">
      {notesState.query ? '該当するメモがありません' : 'メモがありません'}
    </li>
  {/each}
</ul>

<style>
  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .list-title {
    font-weight: 700;
  }
  .new-btn {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--accent);
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .new-btn:hover {
    border-color: var(--accent);
  }

  .search-bar {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0.5rem 0.85rem 0.6rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .search-input {
    width: 100%;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    border-radius: 8px;
    padding: 0.4rem 1.8rem 0.4rem 0.6rem; /* 右はクリアボタン分の余白 */
    font-size: 0.85rem;
    font-family: var(--font);
    outline: none;
  }
  .search-input:focus {
    border-color: var(--accent);
  }
  .search-input::placeholder {
    color: var(--text-muted);
  }
  .search-clear {
    position: absolute;
    right: 1.1rem;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 0.3rem;
    cursor: pointer;
  }
  .search-clear:hover {
    color: var(--text);
  }

  .note-list {
    list-style: none;
    margin: 0;
    padding: 0.4rem;
    overflow-y: auto;
    flex: 1;
  }
  .note-row {
    display: flex;
    align-items: stretch;
    border-radius: 8px;
    margin-bottom: 0.2rem;
  }
  .note-row:hover {
    background: var(--surface);
  }
  .note-row.active {
    background: var(--surface);
    outline: 1px solid var(--accent);
  }

  .note-empty {
    padding: 1.2rem 0.6rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .note-item {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    text-align: left;
    border: none;
    background: transparent;
    padding: 0.55rem 0.6rem;
    cursor: pointer;
  }
  .note-title {
    font-weight: 600;
    font-size: 0.92rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .note-sub {
    display: flex;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    min-width: 0;
  }
  .note-date {
    flex-shrink: 0;
  }
  .note-snippet {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .delete-btn {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 0.6rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s ease;
  }
  .note-row:hover .delete-btn,
  .note-row.active .delete-btn {
    opacity: 1;
  }
  .delete-btn:hover {
    color: var(--danger);
  }

  /* タッチ端末ではホバーがないので常に表示 */
  @media (hover: none) {
    .delete-btn {
      opacity: 1;
    }
  }
</style>
