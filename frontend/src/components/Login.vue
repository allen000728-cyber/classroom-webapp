<script setup>
import { ref } from 'vue'
import { store, login as doLogin } from '../store'

const username = ref('')
const password = ref('')

async function submit() {
  if (!username.value.trim() || !password.value) return
  await doLogin(username.value.trim(), password.value)
  if (store.token) password.value = ''
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>班級日常管理</h1>
      <p class="login-hint">老師或家長請登入查看點名 / 作業狀況</p>
      <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="submit">
      <input type="password" v-model="password" placeholder="密碼" autocomplete="current-password" @keyup.enter="submit">
      <button class="btn btn-save" @click="submit">登入</button>
      <div v-if="store.error" class="error-bar">{{ store.error }}</div>
    </div>
  </div>
</template>
