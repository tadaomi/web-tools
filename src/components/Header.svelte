<script>
  import { theme } from '../lib/theme.svelte.js';

  // ボタンには「押すと切り替わる先」を表示する。
  const isDark = $derived(theme.current === 'dark');
  const label = $derived(isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
</script>

<header class="app-header">
  <a class="brand" href="#/">
    <span class="logo" aria-hidden="true">🧰</span>
    <span class="name">Web便利ツール</span>
  </a>
  <button
    class="theme-btn"
    type="button"
    onclick={() => theme.toggle()}
    aria-label={label}
    title={label}
  >
    <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
  </button>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text);
    font-weight: 700;
    font-size: 1.05rem;
  }
  .logo {
    font-size: 1.2rem;
  }
  .theme-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 1.05rem;
    cursor: pointer;
    transition: border-color 0.12s ease;
  }
  .theme-btn:hover,
  .theme-btn:focus-visible {
    border-color: var(--accent);
    outline: none;
  }
</style>
