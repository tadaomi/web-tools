<script>
  // 画像リサイズツールのメイン（設定パネルのみの仮の枠。処理は次のタスクで追加する）。
  import SettingsPanel from './SettingsPanel.svelte';
</script>

<section class="resizer">
  <header class="head">
    <h1>画像リサイズ</h1>
    <p class="privacy">🔒 すべてブラウザ内で処理されます。画像はサーバーに送信されません。</p>
  </header>
  <SettingsPanel />
</section>

<style>
  .resizer {
    max-width: 960px;
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
</style>
