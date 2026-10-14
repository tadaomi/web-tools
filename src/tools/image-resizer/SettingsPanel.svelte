<script>
  // 設定パネル。値は imageResizer.svelte.js の設定へ直接書き込まれ、自動で保存される。
  import { resizerSettings as s } from './imageResizer.svelte.js';
  import { displayAffix, effectiveSettings, SIZE_MIN, SIZE_MAX } from './lib/settings.js';
  import { sampleName } from './lib/naming.js';

  let { disabled = false } = $props();

  const aspectOptions = [
    { value: 'width', label: '横幅を基準サイズに合わせる' },
    { value: 'height', label: '高さを基準サイズに合わせる' },
    { value: 'longest', label: '長辺を基準サイズに合わせる' },
    { value: 'shortest', label: '短辺を基準サイズに合わせる' },
    { value: 'crop', label: '中央で正方形に切り抜く（基準×基準）' },
    { value: 'none', label: 'リサイズしない' },
  ];
  const squareOptions = [
    { value: 'fit', label: '一辺を基準サイズに合わせる' },
    { value: 'none', label: 'リサイズしない' },
  ];
  const formatOptions = [
    { value: 'original', label: '元の形式を維持（GIF / BMP は PNG）' },
    { value: 'image/png', label: 'PNG に統一' },
    { value: 'image/jpeg', label: 'JPEG に統一' },
    { value: 'image/webp', label: 'WebP に統一（軽量）' },
  ];
  const namingOptions = [
    { value: 'original', label: '元のファイル名のまま' },
    { value: 'suffix', label: '末尾に文字列を追加' },
    { value: 'prefix', label: '先頭に文字列を追加' },
    { value: 'numbering', label: '連番にする' },
  ];
  const affixLabels = {
    suffix: '末尾に追加する文字列',
    prefix: '先頭に追加する文字列',
    numbering: '番号の前に付ける文字列',
  };

  const affixValue = $derived(displayAffix(s));
  const example = $derived(sampleName(effectiveSettings(s)));
  const qualityDisabled = $derived(s.format === 'image/png');

  // 文字列を自分で編集したら、以降は基準サイズや命名規則に追従させない。
  function handleAffixInput(e) {
    s.affix = e.target.value;
    s.affixEdited = true;
  }

  // 命名規則を切り替えたら、その規則の既定文字列に戻す。
  function handleNamingChange() {
    s.affixEdited = false;
  }
</script>

<fieldset class="panel" {disabled}>
  <legend class="visually-hidden">リサイズと出力の設定</legend>

  <div class="row">
    <div class="field">
      <label for="ir-size">基準サイズ（px）</label>
      <input
        id="ir-size"
        type="number"
        min={SIZE_MIN}
        max={SIZE_MAX}
        step="1"
        bind:value={s.size}
      />
    </div>
    <div class="field">
      <label for="ir-format">出力形式</label>
      <select id="ir-format" bind:value={s.format}>
        {#each formatOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="ir-quality">画質（JPEG / WebP）: {Math.round(s.quality * 100)}%</label>
      <input
        id="ir-quality"
        type="range"
        min="0.4"
        max="1"
        step="0.05"
        bind:value={s.quality}
        disabled={qualityDisabled}
      />
    </div>
  </div>

  <div class="row">
    <div class="field">
      <label for="ir-landscape">横長の画像（幅 &gt; 高さ）</label>
      <select id="ir-landscape" bind:value={s.ruleLandscape}>
        {#each aspectOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="ir-portrait">縦長の画像（高さ &gt; 幅）</label>
      <select id="ir-portrait" bind:value={s.rulePortrait}>
        {#each aspectOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="ir-square">正方形の画像</label>
      <select id="ir-square" bind:value={s.ruleSquare}>
        {#each squareOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <label class="check">
    <input type="checkbox" bind:checked={s.noUpscale} />
    小さい画像は拡大しない（基準より小さい画像は元のサイズのまま出力）
  </label>

  <div class="row">
    <div class="field">
      <label for="ir-naming">ファイル名</label>
      <select id="ir-naming" bind:value={s.namingMode} onchange={handleNamingChange}>
        {#each namingOptions as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    {#if s.namingMode !== 'original'}
      <div class="field">
        <label for="ir-affix">{affixLabels[s.namingMode]}</label>
        <input id="ir-affix" type="text" value={affixValue} oninput={handleAffixInput} />
      </div>
    {/if}
    <div class="field">
      <span class="field-label">ファイル名の例</span>
      <code class="example">{example}</code>
    </div>
  </div>
</fieldset>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }
  .field label,
  .field-label {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .field input[type='number'],
  .field input[type='text'],
  .field select {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font);
    font-size: 0.95rem;
  }
  .field input[type='range'] {
    accent-color: var(--accent);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  .check input {
    accent-color: var(--accent);
  }
  .example {
    padding: 0.45rem 0.6rem;
    border: 1px dashed var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--accent);
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .panel:disabled {
    opacity: 0.6;
  }
</style>
