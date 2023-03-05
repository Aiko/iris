<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import Icon from "@Veil/components/Base/Icon.vue"
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue"
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue"
import { infoContent } from '@Veil/state/sections'
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";

// Information variables for 'ModalBoardRules' component
const infoAddCondition = i18n(RosettaStone.modals.board_rules.info_add_condition)


let isExtraRule = ref(false)
const toggleExtraRule = () => isExtraRule.value = !(isExtraRule.value)
</script>

<template>
  <div class="modal-board-rules">
    <Icon name="board" color="blue" />
    <h1>
      {{ i18n(RosettaStone.modals.board_rules.title) }}
    </h1>
    <p>{{ i18n(RosettaStone.modals.board_rules.subtitle) }}</p>
    <h1>{{ i18n(RosettaStone.modals.board_rules.existing) }}</h1>
    <div class="existing">


      <div class="rule">
        <h1>{{ i18n(RosettaStone.modals.board_rules.if) }}</h1>
        <span>
          <h1>{{ i18n(RosettaStone.modals.board_rules.from) }}</h1>
        </span>
        <span>ruben@helloaiko.com</span>
        <span>
          <h1>{{ i18n(RosettaStone.modals.board_rules.move_to) }}</h1>
        </span>
        <span>To-Do</span>

        <div class="extra-rule">
          <h1>{{ i18n(RosettaStone.modals.board_rules.and) }}</h1>
          <span>{{ i18n(RosettaStone.modals.board_rules.from) }}</span>
          <span>ruben@helloaiko.com</span>
          <span>{{ i18n(RosettaStone.modals.board_rules.move_to) }}</span>
          <span>To-Do</span>
        </div>

        <ButtonSecondary color="red">{{ i18n(RosettaStone.modals.board_rules.remove) }}</ButtonSecondary>
      </div>



      <div class="rule">
        {{ i18n(RosettaStone.modals.board_rules.if) }}
        <span>from</span>
        <span>ruben@helloaiko.com</span>
        <span>{{ i18n(RosettaStone.modals.board_rules.move_to) }}</span>
        <span>To-Do</span>
        <ButtonSecondary color="red">{{ i18n(RosettaStone.modals.board_rules.remove) }}</ButtonSecondary>
      </div>

      <div class="rule">
        {{ i18n(RosettaStone.modals.board_rules.if) }}
        <span>{{ i18n(RosettaStone.modals.board_rules.from) }}</span>
        <span>ruben@helloaiko.com</span>
        <span>{{ i18n(RosettaStone.modals.board_rules.move_to) }}</span>
        <span>To-Do</span>
        <ButtonSecondary color="red">{{ i18n(RosettaStone.modals.board_rules.remove) }}</ButtonSecondary>
      </div>


    </div>
    <h1>{{ i18n(RosettaStone.modals.board_rules.new_board_rule) }}</h1>
    <div class="new">

      <div class="condition-container cc1">
        {{ i18n(RosettaStone.modals.board_rules.if) }}
        <select name="condition">
          <option value="From">{{ i18n(RosettaStone.modals.board_rules.from) }}</option>
          <option value="To">{{ i18n(RosettaStone.modals.board_rules.to) }}</option>
          <option value="Subject has">{{ i18n(RosettaStone.modals.board_rules.subject_has) }}</option>
          <option value="Contains">{{ i18n(RosettaStone.modals.board_rules.contains) }}</option>
          <option value="Quick Action">{{ i18n(RosettaStone.modals.board_rules.quick_action) }}</option>
          <option value="Priority">{{ i18n(RosettaStone.modals.board_rules.priority) }}</option>
          <option value="Attachment name">{{ i18n(RosettaStone.modals.board_rules.attachment_name) }}</option>
          <option value="Attachment type">{{ i18n(RosettaStone.modals.board_rules.attachment_type) }}</option>
        </select>
        <input :placeholder="i18n(RosettaStone.modals.board_rules.type_here)" />
        <div class="add-condition">
          <ButtonSecondary @mouseover="infoContent = infoAddCondition" @mouseleave="infoContent = ''"
            @click="toggleExtraRule()" v-if="!isExtraRule">{{ i18n(RosettaStone.modals.board_rules.add_condition) }}
          </ButtonSecondary>
        </div>
      </div>
      <div class="condition-container" v-if="isExtraRule">
        {{ i18n(RosettaStone.modals.board_rules.and) }}
        <select name="condition">
          <option value="From">{{ i18n(RosettaStone.modals.board_rules.from) }}</option>
          <option value="To">{{ i18n(RosettaStone.modals.board_rules.to) }}</option>
          <option value="Subject has">{{ i18n(RosettaStone.modals.board_rules.subject_has) }}</option>
          <option value="Contains">{{ i18n(RosettaStone.modals.board_rules.contains) }}</option>
          <option value="Quick Action">{{ i18n(RosettaStone.modals.board_rules.quick_action) }}</option>
          <option value="Priority">{{ i18n(RosettaStone.modals.board_rules.priority) }}</option>
          <option value="Attachment name">{{ i18n(RosettaStone.modals.board_rules.attachment_name) }}</option>
          <option value="Attachment type">{{ i18n(RosettaStone.modals.board_rules.attachment_type) }}</option>
        </select>
        <input :placeholder="i18n(RosettaStone.modals.board_rules.type_here)" />
        <div class="add-condition">
          <ButtonSecondary @click="toggleExtraRule()" color="red">{{
            i18n(RosettaStone.modals.board_rules.remove_condition)
          }}</ButtonSecondary>
        </div>
      </div>
      <div class="action-container">
        {{ i18n(RosettaStone.modals.board_rules.then_do_this) }}
        <select name="action">
          <option value="Move to">{{ i18n(RosettaStone.modals.board_rules.move_to) }}</option>
          <option value="Star">{{ i18n(RosettaStone.modals.board_rules.star) }}</option>
          <option value="Forward To">{{ i18n(RosettaStone.modals.board_rules.forward_to) }}</option>
          <option value="Archive">{{ i18n(RosettaStone.modals.board_rules.archive) }}</option>
          <option value="Delete">{{ i18n(RosettaStone.modals.board_rules.delete) }}</option>
        </select>
        <select name="destination">
          <option value="board">board</option>
        </select>
      </div>
      <br />
      <ButtonPrimary>{{ i18n(RosettaStone.modals.board_rules.add_rule) }}</ButtonPrimary>
    </div>



    <div class="modal-bottom text-left">
      {{ i18n(RosettaStone.modals.board_rules.force_run) }}<ButtonSecondary>
        {{ i18n(RosettaStone.modals.board_rules.run_everything) }}</ButtonSecondary>
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

.rule h1 {
  display: inline;
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
  position: relative;
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