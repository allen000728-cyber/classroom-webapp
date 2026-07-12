<script setup>
import { store, addNote, renameNote, removeNote } from '../store'

let renameTimers = {}
function onTextInput(note, e) {
  note.text = e.target.value
  clearTimeout(renameTimers[note.id])
  renameTimers[note.id] = setTimeout(() => renameNote(note.id, note.text), 600)
}
</script>

<template>
  <div class="notes-bar">
    <span class="lbl">早自修交待事項：</span>
    <div style="display:flex;gap:5px;flex-wrap:wrap;">
      <div class="assign-item" v-for="n in store.notes" :key="n.id">
        <input
          type="text"
          class="assign-inp notes-inp"
          :value="n.text"
          placeholder="輸入待辦事項…"
          @input="onTextInput(n, $event)"
        >
        <button class="btn-del-assign" title="刪除這筆待辦事項" @click="removeNote(n.id)">×</button>
      </div>
      <button class="btn-add-assign" title="新增待辦事項" @click="addNote">+</button>
    </div>
  </div>
</template>
