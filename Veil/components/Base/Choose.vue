<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
import { ref, computed } from '@vue/reactivity'

export type Choice = {
  value: string
  display: string
}

const props = withDefaults(defineProps<{
  placeholder?: string
  direction?: string
  width?: number
  modelValue: Choice
  choices: Choice[]
}>(), {width: 0, direction: 'down'})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const toggle = () => (isOpen.value = !isOpen.value)

const choice = computed({
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
    ['' + direction]: true, 'isOpen': isOpen
  }" :style="'min-width: ' + width + 'px'">
    <div :class="{
        'choose-container': true,
        'is-open': isOpen,
      }" @click="toggle" tabindex="0" @focusout="isOpen = false" autofocus>

      <div v-if="!!placeholder || !!choice" class="label choose-item">
        {{ choice?.display ?? choice?.value ?? placeholder }}
      </div>

      <div v-if="isOpen" class="overflow-scroll">
        <div
          v-for="option in choices"
          @click="choice = option"
          :key="option.value"
          class="choose-item">
          {{ option.display ?? option.value }}
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
  width: fit-content;
  cursor: default;
  height: 35px;
  position: relative;
  user-select: none;
  overflow: hidden;
}

.isOpen {
  overflow: unset;
}


.label {
  padding-right: 25px;
  pointer-events: none;
}

.choose-container {
  margin-left: -6px;
  margin-top: -3px;
  left: 0;
  border-radius: var(--primary-border-radius);
  width: calc(100% + 38px);
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