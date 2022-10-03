<script lang="ts" setup>
defineProps<{
  text?: string
  active?: boolean
}>()
</script>


<template>
  <a :class="active ? 'active' : ''">

    <!-- TODO: Number here for unread
    <span class="count">
      3
    </span>
    -->
    <slot></slot>

  </a>
</template>

<style scoped>
a {
  width: 100%;
  position: relative;
  padding: 4px 4px 4px 6px;
  border-radius: var(--primary-border-radius);
  font-size: 14px;
  color: var(--primary-font-color) !important;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  height: 30px;
  margin-bottom: 5px;
  letter-spacing: .3px;
  transition: .2s;
}

a:hover {
  background: var(--primary-background-color-hover);
  transition: .2s;
}

.active {
  background: var(--secondary-background-color);
}


.count {
  float: right;
  padding: 1px 4px;
  min-width: 20px;
  font-size: 13px;
  text-align: center;
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
}

.active .count {
  background: var(--primary-background-color);
}
</style>