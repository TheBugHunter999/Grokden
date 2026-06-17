<script lang="ts"></script>

<div class="launch visible">
  <div class="glow" aria-hidden="true"></div>
  <div class="logo-wrap">
    <img src="/favicon.png" alt="Grokden" width="112" height="112" />
  </div>
  <div class="dots" aria-hidden="true">
    <span class="dot"></span>
    <span class="dot active"></span>
    <span class="dot"></span>
  </div>
  <p class="label">Loading Grokden</p>
</div>

<style>
  .launch {
    position: fixed;
    inset: 0;
    z-index: 20000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    background: var(--bg, #0a0a0c);
    opacity: 0;
    transition: opacity 0.55s ease-out;
    pointer-events: none;
  }
  .launch.visible {
    opacity: 1;
  }
  .glow {
    position: absolute;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(74, 158, 255, 0.18) 0%, rgba(139, 124, 248, 0.08) 40%, transparent 70%);
    filter: blur(8px);
    animation: glow-pulse 2.4s ease-in-out infinite;
  }
  .logo-wrap {
    position: relative;
    width: 112px;
    height: 112px;
    border-radius: 26px;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 20px 60px rgba(0, 0, 0, 0.5);
    transform: scale(0.92);
    animation: logo-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
  }
  .logo-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .dots {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.28);
    animation: dot-pulse 1.2s ease-in-out infinite;
  }
  .dot:nth-child(1) { animation-delay: 0s; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  .dot.active {
    background: #fff;
    transform: scale(1.15);
  }
  .label {
    margin: 0;
    font-size: 15px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.72);
    letter-spacing: 0.01em;
    animation: label-in 0.6s ease-out 0.25s both;
  }
  @keyframes logo-in {
    to { transform: scale(1); }
  }
  @keyframes label-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.06); }
  }
  @keyframes dot-pulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
</style>