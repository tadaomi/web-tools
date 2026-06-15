<script>
  import NoteList from './NoteList.svelte';
  import NoteEditor from './NoteEditor.svelte';
  import { notesState, selectNote, createNote, deriveTitle } from './notes.svelte.js';

  // モバイルでのサイドバー（ドロワー）開閉state。
  let sidebarOpen = $state(false);

  const active = $derived(notesState.active);
  const charCount = $derived(active ? active.content.length : 0);

  function handleSelect(id) {
    selectNote(id);
    sidebarOpen = false; // ノート選択でドロワーを閉じる
  }
  function handleCreate() {
    createNote();
    sidebarOpen = false;
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') sidebarOpen = false;
  }}
/>

<div class="notes">
  {#if sidebarOpen}
    <div class="overlay" onclick={() => (sidebarOpen = false)} role="presentation"></div>
  {/if}

  <aside class="sidebar" class:open={sidebarOpen}>
    <NoteList onselect={handleSelect} oncreate={handleCreate} />
  </aside>

  <section class="editor-pane">
    <div class="editor-bar">
      <button class="menu-btn" onclick={() => (sidebarOpen = true)} aria-label="メモ一覧を開く"
        >☰</button
      >
      <span class="editor-title">{active ? deriveTitle(active.content) : ''}</span>
      <span class="save-hint">{charCount} 文字 ・ 自動保存</span>
    </div>

    {#if active}
      {#key active.id}
        <div class="editor-wrap">
          <NoteEditor note={active} />
        </div>
      {/key}
    {:else}
      <div class="empty">メモがありません</div>
    {/if}
  </section>
</div>

<style>
  .notes {
    display: flex;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .sidebar {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid var(--border);
    background: var(--surface-2);
  }

  .editor-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--surface);
  }

  .editor-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .menu-btn {
    display: none; /* デスクトップでは非表示 */
    border: none;
    background: transparent;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
    cursor: pointer;
  }
  .editor-title {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .save-hint {
    flex-shrink: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .editor-wrap {
    flex: 1;
    min-height: 0;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .overlay {
    display: none;
  }

  /* ===== モバイル: サイドバーをドロワー化 ===== */
  @media (max-width: 640px) {
    .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 20;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      box-shadow: var(--shadow);
    }
    .sidebar.open {
      transform: translateX(0);
    }
    .menu-btn {
      display: inline-flex;
      align-items: center;
    }
    .overlay {
      display: block;
      position: absolute;
      inset: 0;
      z-index: 10;
      background: rgba(0, 0, 0, 0.35);
    }
  }
</style>
