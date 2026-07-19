<script setup>
import { ref, onMounted } from 'vue'
import { store, login as doLogin, registerParent, registerTeacher, lookupInvite } from '../store'

const isInviteRegister = ref(!!store.inviteCode) // 家長透過邀請連結註冊
const checking = ref(!!store.inviteCode)
const mode = ref('login') // 'login' | 'teacherRegister' — 沒有邀請碼時才會用到
const username = ref('')
const password = ref('')
const inviteInfo = ref(null) // {seatNo, name}

onMounted(async () => {
  if (isInviteRegister.value) {
    inviteInfo.value = await lookupInvite(store.inviteCode)
    checking.value = false
  }
})

function toggleMode() {
  mode.value = mode.value === 'login' ? 'teacherRegister' : 'login'
  store.error = ''
}

async function submit() {
  if (!username.value.trim() || !password.value) return
  if (isInviteRegister.value) {
    if (!inviteInfo.value) return
    await registerParent(store.inviteCode, username.value.trim(), password.value)
  } else if (mode.value === 'teacherRegister') {
    await registerTeacher(username.value.trim(), password.value)
  } else {
    await doLogin(username.value.trim(), password.value)
  }
  if (store.token) password.value = ''
}
</script>

<template>
  <div class="login-page">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
    <div class="login-card">
      <h1>班級日常管理</h1>

      <template v-if="!isInviteRegister && mode === 'login'">
        <p class="login-hint">老師或家長請登入查看點名 / 作業狀況</p>
        <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="submit">
        <input type="password" v-model="password" placeholder="密碼" autocomplete="current-password" @keyup.enter="submit">
        <button class="btn btn-save" @click="submit">登入</button>
        <button class="btn-link" @click="toggleMode">還沒有老師帳號？註冊一個</button>
      </template>

      <template v-else-if="!isInviteRegister && mode === 'teacherRegister'">
        <p class="login-hint">老師註冊新帳號</p>
        <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="submit">
        <input type="password" v-model="password" placeholder="密碼（至少 8 個字元）" autocomplete="new-password" @keyup.enter="submit">
        <button class="btn btn-save" @click="submit">註冊</button>
        <button class="btn-link" @click="toggleMode">已經有帳號？登入</button>
      </template>

      <template v-else-if="checking">
        <p class="login-hint">確認中…</p>
      </template>

      <template v-else-if="inviteInfo">
        <p class="login-hint">
          確認是<strong>座號 {{ inviteInfo.seatNo }}<template v-if="inviteInfo.name">（{{ inviteInfo.name }}）</template></strong>的家長嗎？<br>
          不是的話請不要繼續，聯絡老師重新取得邀請連結。
        </p>
        <input type="text" v-model="username" placeholder="帳號" autocomplete="username" @keyup.enter="submit">
        <input type="password" v-model="password" placeholder="密碼" autocomplete="new-password" @keyup.enter="submit">
        <button class="btn btn-save" @click="submit">確認並註冊</button>
      </template>

      <div v-if="store.error" class="error-bar">{{ store.error }}</div>
    </div>
  </div>
</template>
