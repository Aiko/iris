<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
let isExtraRule = ref(false)
const toggleExtraRule = () => isExtraRule.value = !(isExtraRule.value)
</script>

<template>
  <div class="modal-board-rules">
    <Icon name="board" color="blue" />
    <h1>Board rules</h1>
    <p>Board rules automatically sort incoming emails from your inbox into your other existing boards.</p>
    <h1>Existing board rules</h1>
    <div class="existing">


      <div class="rule">
        if
        <span>from</span>
        <span>ruben@helloaiko.com</span>
        <span>move to</span>
        <span>To-Do</span>

        <div class="extra-rule">
          and
          <span>from</span>
          <span>ruben@helloaiko.com</span>
          <span>move to</span>
          <span>To-Do</span>
        </div>

        <ButtonSecondary>Remove</ButtonSecondary>
      </div>



      <div class="rule">
        if
        <span>from</span>
        <span>ruben@helloaiko.com</span>
        <span>move to</span>
        <span>To-Do</span>
        <ButtonSecondary>Remove</ButtonSecondary>
      </div>

      <div class="rule">
        if
        <span>from</span>
        <span>ruben@helloaiko.com</span>
        <span>move to</span>
        <span>To-Do</span>
        <ButtonSecondary>Remove</ButtonSecondary>
      </div>

      <div class="rule">
        if
        <span>from</span>
        <span>ruben@helloaiko.com</span>
        <span>move to</span>
        <span>To-Do</span>
        <ButtonSecondary>Remove</ButtonSecondary>
      </div>

      <div class="rule">
        if
        <span>from</span>
        <span>ruben@helloaiko.com</span>
        <span>move to</span>
        <span>To-Do</span>
        <ButtonSecondary>Remove</ButtonSecondary>
      </div>

      <div class="rule">
        if
        <span>from</span>
        <span>ruben@helloaiko.com</span>
        <span>move to</span>
        <span>To-Do</span>
        <ButtonSecondary>Remove</ButtonSecondary>
      </div>
    </div>
    <h1>New board rule</h1>
    <div class="new">

      <div class="condition-container cc1">
        if
        <select name="condition">
          <option value="From">From</option>
          <option value="To">To</option>
          <option value="Subject has">Subject has</option>
          <option value="Contains">Contains</option>
          <option value="Quick Action">Quick Action</option>
          <option value="Priority">Priority</option>
          <option value="Attachment name">Attachment name</option>
          <option value="Attachment type">Attachment type</option>
        </select>
        <input placeholder="Type here" />
        <div class="add-condition">
          <ButtonSecondary @click="toggleExtraRule()" v-if="!isExtraRule">Add another condition (Optional)
          </ButtonSecondary>
        </div>
      </div>
      <div class="condition-container" v-if="isExtraRule">
        and
        <select name="condition">
          <option value="From">From</option>
          <option value="To">To</option>
          <option value="Subject has">Subject has</option>
          <option value="Contains">Contains</option>
          <option value="Quick Action">Quick Action</option>
          <option value="Priority">Priority</option>
          <option value="Attachment name">Attachment name</option>
          <option value="Attachment type">Attachment type</option>
        </select>
        <input placeholder="Type here" />
        <div class="add-condition">
          <ButtonSecondary @click="toggleExtraRule()">Remove extra condition</ButtonSecondary>
        </div>
      </div>
      <div class="action-container">
        then do this:
        <select name="action">
          <option value="Move to">Move to</option>
          <option value="Star">Star</option>
          <option value="Forward To">Forward To</option>
          <option value="Archive">Archive</option>
          <option value="Delete">Delete</option>
        </select>
        <select name="destination">
          <option value="board">board</option>
        </select>
      </div>
      <br />
      <ButtonPrimary>Add rule</ButtonPrimary>
    </div>



    <div class="modal-bottom text-left">
      Run all rules on existing emails<ButtonSecondary>Run everything</ButtonSecondary>
    </div>
  </div>
</template>

<style scoped>
.modal-board-rules {
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 20px;
}

img {
  width: 40px;
  margin-bottom: -20px;
  margin-top: 10px;
}

h1 {
  font-size: 16px;
  margin-top: 40px;
}

input {
  width: 100%;
  max-width: 250px;
  border-radius: var(--primary-border-radius);
  font-size: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
  color: var(--strong-font-color);
  background: var(--secondary-background-color);
  cursor: text !important;
  padding: 3px 10px;
}

.rule {
  padding: 5px 0;
  position: relative;
  border-bottom: 2px solid var(--primary-background-color);
  transition: .2s;
  cursor: pointer;
  user-select: none;
}

.rule:hover {
  opacity: .9;
  transition: .2s;
}

.rule a {
  position: absolute;
  right: 0;
  top: 0;
  margin-top: 3px;
}

.rule span {
  margin-left: 10px;
}

.existing {
  background: var(--secondary-background-color);
  width: 100%;
  max-width: 700px;
  margin: auto;
  height: 210px;
  overflow: scroll;
  border-radius: var(--primary-border-radius);
  color: var(--primary-font-color);
  padding: 10px;
  text-align: left;
}

.new {
  background: var(--secondary-background-color);
  width: 100%;
  max-width: 700px;
  margin: auto;
  min-height: 60px;
  border-radius: var(--primary-border-radius);
  color: var(--primary-font-color);
  margin-bottom: 80px;
  padding: 10px 10px 20px 10px;
}


.modal-bottom {
  color: var(--primary-font-color);
}

.modal-bottom a {
  margin-left: 10px;
}

.new select {
  margin-left: 5px;
}

select {
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  border: 1px solid var(--secondary-background-color);
  padding: 5px;
  color: var(--primary-font-color);
  margin-right: 8px;
  outline: none !important;
}

.extra-rule {
  margin-left: 23px;
}

.cc1 {
  padding-left: 26px !important;
  padding-bottom: 0 !important;
}

.condition-container {
  text-align: left;
  padding: 10px;
}

.action-container {
  text-align: left;
  padding: 30px 0 0px 20px;
}

.add-condition {
  text-align: left;
  margin-left: -10px;
}
</style>