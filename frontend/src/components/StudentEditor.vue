<script setup>
import { ref, computed } from 'vue'
import { store, addStudent, updateStudent, deleteStudent, generateInvite } from '../store'

defineEmits(['close'])

const newSeatNo = ref('')
const newName = ref('')

const sortedStudents = computed(() => store.students.slice().sort((a, b) => a.seat_no - b.seat_no))

function onAdd() {
  const seatNo = parseInt(newSeatNo.value, 10)
  if (!seatNo || seatNo < 1) return
  addStudent(seatNo, newName.value.trim())
  newSeatNo.value = ''
  newName.value = ''
}

let saveTimers = {}
function debounced(key, fn) {
  clearTimeout(saveTimers[key])
  saveTimers[key] = setTimeout(fn, 600)
}

function onSeatNoInput(student, e) {
  const seatNo = parseInt(e.target.value, 10)
  if (!seatNo || seatNo < 1) return
  debounced('seat' + student.id, () => updateStudent(student.id, { seatNo }))
}

function onNameInput(student, e) {
  debounced('name' + student.id, () => updateStudent(student.id, { name: e.target.value }))
}

function onActiveChange(student, e) {
  updateStudent(student.id, { active: e.target.checked })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <h2>編輯學生</h2>

      <div class="student-edit-scroll">
        <table class="student-edit-tbl">
          <thead>
            <tr>
              <th>座號</th>
              <th>姓名</th>
              <th>啟用</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sortedStudents" :key="s.id">
              <td><input type="text" class="student-edit-inp" :value="s.seat_no" @input="onSeatNoInput(s, $event)"></td>
              <td><input type="text" class="student-edit-inp" :value="s.name" placeholder="（未填）" @input="onNameInput(s, $event)"></td>
              <td><input type="checkbox" :checked="s.active" @change="onActiveChange(s, $event)"></td>
              <td><button class="btn btn-warn student-invite-btn" title="產生家長註冊連結" @click="generateInvite(s)">邀請家長</button></td>
              <td><button class="btn-del-assign" title="刪除這個學生" @click="deleteStudent(s)">×</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="student-add-row">
        <input type="text" class="student-edit-inp" v-model="newSeatNo" placeholder="座號" inputmode="numeric" @keyup.enter="onAdd">
        <input type="text" class="student-edit-inp" v-model="newName" placeholder="姓名（選填）" @keyup.enter="onAdd">
        <button class="btn btn-save" @click="onAdd">新增學生</button>
      </div>

      <div v-if="store.error" class="error-bar">{{ store.error }}</div>
      <button class="btn btn-clear" @click="$emit('close')">關閉</button>
    </div>
  </div>
</template>
