<script setup>
import { ref } from 'vue'
import { store, createClass, logout } from '../store'

const grade = ref('')
const classNumber = ref('')

function submit() {
  const g = parseInt(grade.value, 10)
  const c = parseInt(classNumber.value, 10)
  if (!g || g < 1 || !c || c < 1) return
  createClass(g, c)
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>建立班級</h1>
      <p class="login-hint">目前還沒有帶班，請先建立這學年的班級</p>
      <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
        <input type="text" v-model="grade" placeholder="年級" inputmode="numeric" style="width:70px; text-align:center;" @keyup.enter="submit">
        <span class="lbl">年</span>
        <input type="text" v-model="classNumber" placeholder="班別" inputmode="numeric" style="width:70px; text-align:center;" @keyup.enter="submit">
        <span class="lbl">班</span>
      </div>
      <button class="btn btn-save" @click="submit">建立班級</button>
      <button class="btn btn-clear" @click="logout">登出</button>
      <div v-if="store.error" class="error-bar">{{ store.error }}</div>
    </div>
  </div>
</template>
