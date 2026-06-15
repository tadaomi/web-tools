<script>
  import { tools } from '../lib/registry.js';
</script>

<section class="home">
  <div class="hero">
    <h1>Web便利ツール</h1>
    <p>気軽に使える、軽量なツール集</p>
  </div>

  <ul class="tool-grid">
    {#each tools as tool (tool.id)}
      <li>
        <a class="tool-card" href={`#/${tool.id}`}>
          <span class="tool-icon" aria-hidden="true">{tool.icon}</span>
          <span class="tool-name">{tool.title}</span>
          <span class="tool-desc">{tool.description}</span>
        </a>
      </li>
    {/each}
  </ul>
</section>

<style>
  .home {
    max-width: 860px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem;
  }
  .hero {
    text-align: center;
    margin-bottom: 2rem;
  }
  .hero h1 {
    margin: 0 0 0.25rem;
    font-size: 1.8rem;
  }
  .hero p {
    margin: 0;
    color: var(--text-muted);
  }
  .tool-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .tool-card {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    height: 100%;
    padding: 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    color: var(--text);
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .tool-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
  }
  .tool-icon {
    font-size: 1.8rem;
  }
  .tool-name {
    font-weight: 600;
    font-size: 1.05rem;
  }
  .tool-desc {
    color: var(--text-muted);
    font-size: 0.88rem;
  }
</style>
