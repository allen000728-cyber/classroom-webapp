<script setup>
import { ref, watch } from 'vue'
import { store, saveNotes, autoSaveNotes, clearDay, applyExcluded, setStudentCount, changeDate } from '../store'

const countInput = ref(store.countInput)
watch(() => store.countInput, (v) => { countInput.value = v })

function onDateChange(e) {
  changeDate(e.target.value)
}

function onCountChange(e) {
  setStudentCount(e.target.value)
}
</script>

<template>
  <div class="header">
    <span class="lbl">日期：</span>
    <input type="date" :value="store.date" @change="onDateChange">

    <span class="lbl">早自修交待事項：</span>
    <input
      type="text"
      id="inp-notes"
      v-model="store.notes"
      placeholder="輸入今日待辦…"
      @input="autoSaveNotes"
    >

    <span class="lbl-small">學生人數：</span>
    <input
      type="text"
      id="inp-count"
      v-model="countInput"
      title="設定學生人數後按 Enter 重建"
      @change="onCountChange"
    >

    <span class="lbl-small">排除座號：</span>
    <input
      type="text"
      id="inp-excluded"
      v-model="store.excludedInput"
      placeholder="如：14 或 14,22"
      title="輸入不存在的座號（逗號分隔），按 Enter 套用"
      @change="applyExcluded"
    >

    <button class="btn btn-save" @click="saveNotes">{{ store.saveLabel }}</button>
    <button class="btn btn-clear" @click="clearDay">清除當日紀錄</button>
  </div>
</template>
