<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
import { ref, computed } from '@vue/reactivity'

export type Choice = {
  value: string
  display: string
}

const props = defineProps<{
  placeholder?: string
  direction?: string
  width?: number
  modelValue?: Choice
  choices?: Choice[]
}>();
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const toggle = () => (isOpen.value = !isOpen.value)

const _choice = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})
</script>

<template>
  <div class="choose" :class="{
    ['' + direction]: true, 'isOpen': isOpen, ['w' + width]: true,
  }">
    <div :class="{
        'choose-container': true,
        'is-open': isOpen,
      }" @click="toggle" tabindex="0" @focusout="isOpen = false" autofocus>

      <div v-if="!!placeholder || !!choice" class="label choose-item">
        {{ choice?.display ?? choice?.value ?? placeholder }}
      </div>

      <div v-if="isOpen" class="overflow-scroll">
        <div
          v-for="choice in choices"
          @click="_choice = choice"
          :key="choice.value"
          class="choose-item">
          {{ choice.display ?? choice.value }}
        </div>
      </div>

      <Icon name="roundedx" color="normal" class="icon" v-if="isOpen" />
      <Icon name="down" color="normal" class="icon" v-if="!isOpen" />

    </div>
  </div>
</template>

<style lang="scss" scoped>
.choose {
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  border: 1px solid var(--secondary-background-color) !important;
  padding: 2px 32px 0px 5px;
  color: var(--primary-font-color);
  outline: none !important;
  width: 150px;
  cursor: default;
  height: 35px;
  position: relative;
  user-choose: none;
  overflow: hidden;
}

.isOpen {
  overflow: unset;
}

.w50,
.w50 .choose-container {
  width: 50px !important;
}

.w100,
.w100 .choose-container {
  width: 100px !important;
}

.w150,
.w150 .choose-container {
  width: 150px !important;
}

.w200,
.w200 .choose-container {
  width: 200px !important;
}

.w250,
.w250 .choose-container {
  width: 250px !important;
}

.w300,
.w300 .choose-container {
  width: 300px !important;
}



.label {
  padding-right: 25px;
  pointer-events: none;
}

.choose-container {
  width: calc(100% - 15px);
  margin-left: -6px;
  margin-top: -3px;
  left: 0;
  position: absolute;
  border-radius: var(--primary-border-radius);
}

.overflow-scroll {
  overflow-y: scroll;
}

.is-open {
  background: var(--p-opaque);

  border: 1px solid var(--secondary-background-color) !important;
  z-index: 1000;
}

.icon {
  position: absolute;
  top: 0;
  right: 0;
  pointer-events: none;
  margin: 5px;
  width: 24px;
}

.right .icon {
  transform: rotate(-90deg);
}

.left .icon {
  transform: rotate(90deg);
}

.top .icon {
  transform: rotate(180deg);
}

.normal {}

.down {}

.top .choose-container {
  position: absolute;
  bottom: 0;
  margin: 0;
  padding-bottom: 35px;
}

.top .label {
  position: absolute;
  bottom: 0;
}

.top .icon {
  top: unset;
  bottom: 0;
}

.left {}

.choose-item {
  margin: 3px 3px 3px 3px;
  padding: 2px 7px;
  border-radius: var(--primary-border-radius);
  white-space: nowrap;
  text-overflow: ellipsis;
  width: calc(100% - 6px);
  overflow: hidden;
}

.choose-item:hover {
  background-color: var(--secondary-background-color);

}
</style>