<script setup>
import { ref } from 'vue'
import { store, login as doLogin, registerParent } from '../store'

const mode = ref(store.inviteCode ? 'register' : 'login')
const code = ref(store.inviteCode)
const username = ref('')
const password = ref('')

async function submit() {
  if (mode.value === 'login') {
    if (!username.value.trim() || !password.value) return
    await doLogin(username.value.trim(), password.value)
  } else {
    if (!code.value.trim() || !username.value.trim() || !password.value) return
    await registerParent(code.value.trim(), username.value.trim(), password.value)
  }
  if (store.token) password.value = ''
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  store.error = ''
}
</script>

<template>
  <div class="login-page">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
    <div class="login-card">
      <h1>班級日常管理</h1>
      <p class="login-hint" v-if="mode === 'login'">老師或家長請登入查看點名 / 作業狀況</p>
      <p class="login-hint" v-else>請輸入老師提供的邀請碼，設定家長帳號密碼</p>

      <input
        v-if="mode === 'register'"
        type="text"
        v-model="code"
        placeholder="邀請碼"
        @keyup.enter="submit"
      >
      <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="submit">
      <input
        type="password"
        v-model="password"
        placeholder="密碼"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        @keyup.enter="submit"
      >
      <button class="btn btn-save" @click="submit">{{ mode === 'login' ? '登入' : '註冊' }}</button>
      <button class="btn btn-clear" @click="toggleMode">
        {{ mode === 'login' ? '家長帳號註冊' : '返回登入' }}
      </button>
      <div v-if="store.error" class="error-bar">{{ store.error }}</div>
    </div>
  </div>
</template>
