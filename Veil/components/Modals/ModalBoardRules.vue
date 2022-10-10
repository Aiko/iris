<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
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
      <ButtonPrimary class="ml-2">Add rule</ButtonPrimary>
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
  margin-top: 50px;
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
  padding: 8px 10px;
}

.rule {
  padding: 5px 0;
}

.rule a {
  margin-left: 10px;
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
</style>