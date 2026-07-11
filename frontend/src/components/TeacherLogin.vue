<script setup>
import { ref } from 'vue'
import { store, teacherLogin, teacherLogout } from '../store'

const input = ref('')

function login() {
  if (!input.value.trim()) return
  teacherLogin(input.value.trim())
  input.value = ''
}
</script>

<template>
  <div class="teacher-bar">
    <template v-if="store.token">
      <span class="lbl-small">✓ 已登入老師模式</span>
      <button class="btn btn-clear" @click="teacherLogout">登出</button>
    </template>
    <template v-else>
      <span class="lbl-small">老師登入（貼上 token）：</span>
      <input type="password" v-model="input" placeholder="TEACHER_TOKEN" @keyup.enter="login">
      <button class="btn btn-save" @click="login">登入</button>
    </template>
  </div>
  <div v-if="store.error" class="error-bar">{{ store.error }}</div>
</template>
