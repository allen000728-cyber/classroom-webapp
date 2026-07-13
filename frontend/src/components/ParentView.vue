<script setup>
import { computed, onMounted } from 'vue'
import { store, loadStudents, loadDay, changeDate, logout, ROLL_LABEL } from '../store'

onMounted(async () => {
  await loadStudents()
  await loadDay(store.date)
})

const child = computed(() => store.students[0])

const rollLabel = computed(() => {
  if (!child.value) return ''
  const s = store.attendance[child.value.seat_no] || 0
  return s ? ROLL_LABEL[s] : '尚未點名'
})

function isMissing(assignmentId) {
  if (!child.value) return false
  return !!store.submissions[assignmentId]?.[child.value.seat_no]
}

function onDateChange(e) {
  changeDate(e.target.value)
}
</script>

<template>
  <div class="parent-page">
    <div class="parent-header">
      <span class="lbl">日期：</span>
      <input type="date" :value="store.date" @change="onDateChange">
      <div style="flex:1;"></div>
      <button class="btn btn-clear" @click="logout">登出</button>
    </div>

    <div v-if="store.error" class="error-bar">{{ store.error }}</div>

    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="parent-card" v-if="child">
      <h2>座號 {{ child.seat_no }} 的狀況</h2>

      <div class="parent-block">
        <span class="parent-row-lbl">早自修交待事項</span>
        <div v-if="!store.notes.length">（無）</div>
        <ul v-else class="parent-notes-list">
          <li v-for="n in store.notes" :key="n.id">{{ n.text }}</li>
        </ul>
      </div>

      <div class="parent-row">
        <span class="parent-row-lbl">出席狀況</span>
        <span class="chip" style="background:oklch(93% 0.02 260); color:oklch(45% 0.02 260);">{{ rollLabel }}</span>
      </div>

      <div class="parent-row" v-if="!store.assignments.length">
        <span class="parent-row-lbl">作業</span>
        <span>（今天還沒有作業項目）</span>
      </div>
      <ul class="parent-hw-list" v-else>
        <li v-for="(a, i) in store.assignments" :key="a.id">
          <span>{{ a.name || ('項目' + (i + 1)) }}</span>
          <span class="chip" :class="isMissing(a.id) ? 'hw-missing' : 'hw-done'">
            {{ isMissing(a.id) ? '缺交' : '已繳交' }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
