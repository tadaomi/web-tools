<script>
  import Header from './components/Header.svelte';
  import Home from './components/Home.svelte';
  import { getRoute } from './lib/router.svelte.js';
  import { tools } from './lib/registry.js';

  const route = $derived(getRoute());
  const activeTool = $derived(route !== '/' ? tools.find((t) => `/${t.id}` === route) : null);
</script>

<Header />

<main>
  {#if activeTool}
    {#await activeTool.load() then mod}
      {@const Tool = mod.default}
      <Tool />
    {:catch}
      <div class="load-error">ツールの読み込みに失敗しました。</div>
    {/await}
  {:else}
    <Home />
  {/if}
</main>

<style>
  main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .load-error {
    padding: 2rem;
    text-align: center;
    color: var(--danger);
  }
</style>
