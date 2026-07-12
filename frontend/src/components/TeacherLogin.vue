<script setup>
import { ref } from 'vue'
import { store, teacherLogin, teacherLogout } from '../store'

const username = ref('')
const password = ref('')

async function login() {
  if (!username.value.trim() || !password.value) return
  await teacherLogin(username.value.trim(), password.value)
  if (store.token) password.value = ''
}
</script>

<template>
  <div class="teacher-bar">
    <template v-if="store.token">
      <span class="lbl-small">✓ 已登入老師模式</span>
      <button class="btn btn-clear" @click="teacherLogout">登出</button>
    </template>
    <template v-else>
      <span class="lbl-small">老師登入：</span>
      <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="login">
      <input type="password" v-model="password" placeholder="密碼" autocomplete="current-password" @keyup.enter="login">
      <button class="btn btn-save" @click="login">登入</button>
    </template>
  </div>
  <div v-if="store.error" class="error-bar">{{ store.error }}</div>
</template>
