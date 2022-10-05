<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
defineProps<{
  text?: string
  active?: boolean
}>()
</script>


<template>
  <div class="home-picker">

    <a :class="active ? 'active' : ''" title="All your inboxes">
      <Icon name="home" color="grey" />
      {{text}}
      <span class="count">
        99+
      </span>
    </a>

    <a :class="active ? 'active' : ''" title="Custom space">
      <Icon name="home" color="grey" />
      Space
      <span class="count">
        99+
      </span>
    </a>

    <a :class="active ? 'active' : ''" title="ruben@helloaiko.com (3)">
      ruben@helloaiko.com
    </a>

    <a :class="active ? 'active' : ''" title="rubencharlestouitou@gmail.com (33)">
      rubencharlestouitou@gmail.com
    </a>


  </div>
</template>

<style scoped>
.home-picker {
  width: 100%;
  display: grid;
  overflow: hidden;
}

.home-picker {
  height: 38px;
  transition: .2s;
}

.sidebar.collapsed .count {
  display: none !important;
}

.home-picker:hover {
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
  margin-top: 3px;
}

.home-picker:hover {
  height: fit-content;
  transition: .2s;
}

.home-picker a {
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
}

.home-picker a:hover {
  background: var(--primary-background-color-hover);
  border-radius: 0;
}

.home-picker:hover a:first-child {
  margin-top: 0;
}

.home-picker:hover a:last-child {
  margin-bottom: 0;
}

.active {
  background: var(--secondary-background-color);
}

img {
  width: 17px;
  margin-right: 3px;
  margin-top: -3px;
}

.count {
  float: right;
  padding: 1px 4px;
  min-width: 20px;
  text-align: center;
  font-size: 13px;
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
}

.active .count {
  background: var(--primary-background-color);
}
</style>