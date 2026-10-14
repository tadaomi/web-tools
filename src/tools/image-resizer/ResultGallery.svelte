<script>
  // 結果カードの一覧。成功はプレビューと個別保存、失敗は理由を表示する。
  import { formatBytes } from './lib/format.js';
  import { splitPath } from './lib/naming.js';

  let { results, onsave } = $props();
</script>

<ul class="grid">
  {#each results as item (item.id)}
    <li class="card" class:failed={!item.ok}>
      {#if item.ok}
        {@const out = splitPath(item.outPath)}
        {@const src = splitPath(item.srcPath)}
        <div class="thumb">
          <img src={item.url} alt={item.outPath} loading="lazy" />
          <span class="badge">{item.outW}×{item.outH}</span>
        </div>
        <div class="body">
          <span class="name" title={item.outPath}>{out.name}</span>
          {#if out.dir}
            <span class="sub" title={out.dir}>{out.dir}</span>
          {/if}
          {#if src.name !== out.name}
            <span class="sub" title={item.srcPath}>元: {src.name}</span>
          {/if}
          <span class="meta">元 {item.srcW}×{item.srcH} ・ {formatBytes(item.outSize)}</span>
          {#each item.notes as note (note)}
            <span class="note">{note}</span>
          {/each}
          <button class="save-btn" onclick={() => onsave?.(item)}>保存</button>
        </div>
      {:else}
        <div class="body">
          <span class="name" title={item.srcPath}>{item.srcPath}</span>
          <span class="error">{item.error}</span>
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .card.failed {
    border-color: var(--danger);
  }
  /* 透過部分が分かるよう市松模様の背景にする。 */
  .thumb {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border);
    background-color: var(--surface);
    background-image:
      linear-gradient(45deg, var(--surface-2) 25%, transparent 25%),
      linear-gradient(-45deg, var(--surface-2) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--surface-2) 75%),
      linear-gradient(-45deg, transparent 75%, var(--surface-2) 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0;
  }
  .thumb img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .badge {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    padding: 0.05rem 0.4rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.6);
    color: #ffffff;
    font-size: 0.7rem;
    font-family: ui-monospace, monospace;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem 0.6rem 0.6rem;
    min-width: 0;
  }
  .name {
    font-size: 0.8rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub,
  .meta {
    font-size: 0.72rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .note {
    font-size: 0.72rem;
    color: var(--accent);
  }
  .error {
    font-size: 0.75rem;
    color: var(--danger);
  }
  .save-btn {
    align-self: flex-end;
    margin-top: 0.25rem;
    border: none;
    background: transparent;
    color: var(--accent);
    font-family: var(--font);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.1rem 0.3rem;
  }
  .save-btn:hover {
    text-decoration: underline;
  }
</style>
