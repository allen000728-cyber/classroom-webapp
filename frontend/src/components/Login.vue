<script setup>
import { ref, onMounted } from 'vue'
import { store, login as doLogin, registerParent, lookupInvite } from '../store'

const mode = ref(store.inviteCode ? 'register' : 'login')
const stage = ref(store.inviteCode ? 'checking' : 'enterCode') // 'enterCode' | 'checking' | 'confirm'
const code = ref(store.inviteCode)
const username = ref('')
const password = ref('')
const inviteInfo = ref(null) // {seatNo, name}

async function checkCode() {
  if (!code.value.trim()) return
  stage.value = 'checking'
  const info = await lookupInvite(code.value.trim())
  if (info) {
    inviteInfo.value = info
    stage.value = 'confirm'
  } else {
    stage.value = 'enterCode'
  }
}

onMounted(() => {
  if (stage.value === 'checking') checkCode()
})

async function submit() {
  if (!username.value.trim() || !password.value) return
  if (mode.value === 'login') {
    await doLogin(username.value.trim(), password.value)
  } else if (stage.value === 'confirm') {
    await registerParent(code.value.trim(), username.value.trim(), password.value)
  }
  if (store.token) password.value = ''
}

function retryCode() {
  code.value = ''
  inviteInfo.value = null
  stage.value = 'enterCode'
  store.error = ''
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  retryCode()
}
</script>

<template>
  <div class="login-page">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
    <div class="login-card">
      <h1>班級日常管理</h1>

      <template v-if="mode === 'login'">
        <p class="login-hint">老師或家長請登入查看點名 / 作業狀況</p>
        <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="submit">
        <input type="password" v-model="password" placeholder="密碼" autocomplete="current-password" @keyup.enter="submit">
        <button class="btn btn-save" @click="submit">登入</button>
      </template>

      <template v-else>
        <template v-if="stage === 'enterCode'">
          <p class="login-hint">請輸入老師提供的邀請碼</p>
          <input type="text" v-model="code" placeholder="邀請碼" @keyup.enter="checkCode">
          <button class="btn btn-save" @click="checkCode">確認邀請碼</button>
        </template>

        <template v-else-if="stage === 'checking'">
          <p class="login-hint">確認中…</p>
        </template>

        <template v-else>
          <p class="login-hint">
            確認是<strong>座號 {{ inviteInfo.seatNo }}<template v-if="inviteInfo.name">（{{ inviteInfo.name }}）</template></strong>的家長嗎？<br>
            不是的話請不要繼續，聯絡老師確認。
          </p>
          <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="submit">
          <input type="password" v-model="password" placeholder="密碼" autocomplete="new-password" @keyup.enter="submit">
          <button class="btn btn-save" @click="submit">確認並註冊</button>
          <button class="btn btn-clear" @click="retryCode">不是這個學生，重新輸入邀請碼</button>
        </template>
      </template>

      <button class="btn btn-clear" @click="toggleMode">
        {{ mode === 'login' ? '家長帳號註冊' : '返回登入' }}
      </button>
      <div v-if="store.error" class="error-bar">{{ store.error }}</div>
    </div>
  </div>
</template>
