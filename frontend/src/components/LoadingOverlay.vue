<template>
  <div class="loading-overlay">
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="10" y="6" width="70" height="48" rx="6" fill="white" stroke="#dcdcdc" stroke-width="2"/>
      <path
        d="M20 30 Q35 24 50 28"
        stroke="#c9542f"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="40"
        class="chalk-line"
      />
      <g class="teacher-head">
        <circle cx="92" cy="34" r="10" fill="#c9542f"/>
        <rect x="82" y="46" width="20" height="30" rx="8" fill="#4a8a94"/>
        <g class="teacher-arm">
          <rect x="66" y="49" width="20" height="7" rx="3.5" fill="#4a8a94"/>
        </g>
      </g>
    </svg>
    <div class="loading-text">載入中…</div>
  </div>
</template>
