<script setup>
import { watch } from 'vue'
import Login from './components/Login.vue'
import ClassSetup from './components/ClassSetup.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import HeaderBar from './components/HeaderBar.vue'
import NotesBar from './components/NotesBar.vue'
import RollPanel from './components/RollPanel.vue'
import HomeworkPanel from './components/HomeworkPanel.vue'
import ParentView from './components/ParentView.vue'
import { store, init } from './store'

// 涵蓋兩種情況：頁面重整時已經是登入狀態、以及剛登入成功那一刻
watch(
  () => store.role === 'teacher' && !!store.token,
  (isTeacher) => { if (isTeacher) init() },
  { immediate: true }
)
</script>

<template>
  <Login v-if="!store.token" />
  <div v-else-if="store.role === 'teacher'" class="teacher-shell">
    <Transition name="fade">
      <LoadingOverlay v-if="!store.classInfoReady" />
    </Transition>
    <template v-if="store.classInfoReady">
      <ClassSetup v-if="!store.classInfo" />
      <template v-else>
        <HeaderBar />
        <NotesBar />
        <div class="main">
          <RollPanel />
          <HomeworkPanel />
        </div>
      </template>
    </template>
  </div>
  <ParentView v-else />
</template>
