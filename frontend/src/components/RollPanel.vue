<script setup>
import { computed } from 'vue'
import { store, cycleRoll, visibleStudents, ROLL_LABEL, ROLL_CLASS } from '../store'

const seats = computed(() => visibleStudents())

function statusTitle(seatNo) {
  const s = store.attendance[seatNo] || 0
  return s ? ROLL_LABEL[s] : '尚未點名'
}
</script>

<template>
  <div class="roll">
    <div class="panel-hd">點名區</div>
    <div class="roll-legend">點擊切換：到 → 缺席 → 請假</div>
    <div class="roll-grid">
      <button
        v-for="s in seats"
        :key="s.id"
        class="roll-btn"
        :class="ROLL_CLASS[store.attendance[s.seat_no] || 0]"
        :title="statusTitle(s.seat_no)"
        @click="cycleRoll(s.seat_no)"
      >{{ s.seat_no }}</button>
    </div>
  </div>
</template>
