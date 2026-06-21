<script>
  // PDFツールのメイン。分割／結合／圧縮をタブで切り替える。
  // すべての処理はブラウザ内で完結し、ファイルはサーバーに送信されない。
  import SplitTab from './SplitTab.svelte';
  import MergeTab from './MergeTab.svelte';
  import CompressTab from './CompressTab.svelte';
  import { pdfState } from './pdf.svelte.js';

  const tabs = [
    { id: 'split', label: '分割' },
    { id: 'merge', label: '結合' },
    { id: 'compress', label: '圧縮' },
  ];
</script>

<section class="pdf">
  <header class="head">
    <h1>PDFツール</h1>
    <p class="privacy">🔒 すべてブラウザ内で処理されます。ファイルはサーバーに送信されません。</p>
  </header>

  <div class="tabbar" role="tablist">
    {#each tabs as tab (tab.id)}
      <button
        class="tab-btn"
        class:active={pdfState.activeTab === tab.id}
        role="tab"
        aria-selected={pdfState.activeTab === tab.id}
        onclick={() => (pdfState.activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="panel">
    <!-- タブ切替で前タブのファイル状態を確実に破棄するため key で作り直す。 -->
    {#key pdfState.activeTab}
      {#if pdfState.activeTab === 'split'}
        <SplitTab />
      {:else if pdfState.activeTab === 'merge'}
        <MergeTab />
      {:else}
        <CompressTab />
      {/if}
    {/key}
  </div>
</section>

<style>
  .pdf {
    max-width: 760px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
  }
  .head {
    margin-bottom: 1.25rem;
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
  .tabbar {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
  }
  .tab-btn {
    border: none;
    background: transparent;
    padding: 0.6rem 1.1rem;
    font-family: var(--font);
    font-size: 0.95rem;
    color: var(--text-muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition:
      color 0.12s ease,
      border-color 0.12s ease;
  }
  .tab-btn:hover {
    color: var(--text);
  }
  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }
</style>
