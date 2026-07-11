<script setup>
import { onMounted } from "vue";
import HeaderBar from "./components/HeaderBar.vue";
import TeacherLogin from "./components/TeacherLogin.vue";
import RollPanel from "./components/RollPanel.vue";
import HomeworkPanel from "./components/HomeworkPanel.vue";
import { init } from "./store";

onMounted(() => { init() });
</script>

<template>
  <HeaderBar />
  <TeacherLogin />
  <div class="main">
    <RollPanel />
    <HomeworkPanel />
  </div>
</template>
