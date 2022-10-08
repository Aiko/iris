<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
import { infoContent } from '@Veil/state/sections'
defineProps<{
  text?: string
  active?: boolean
}>()

// Information variables for 'NavLinkHome' component
const infoSpaces = 'Create custom spaces to separate different topics, you can decide to display certain boards in only certain Spaces.'
</script>


<template>
  <div class="home-picker">

    <a :class="active ? 'active' : ''">
      <Icon name="home" color="normal" />
      {{text}}
      <span class="count">
        99+
      </span>
    </a>

    <a :class="active ? 'active' : ''">
      <Icon name="home" color="normal" />
      Space
      <span class="count">
        99+
      </span>
    </a>

    <a :class="active ? 'active' : ''">
      <img src="@Veil/assets/img/user.png" />
      ruben@helloaiko.com
      <span class="count">
        99+
      </span>
    </a>

    <a :class="active ? 'active' : ''">
      <img src="@Veil/assets/img/user.png" />
      rubencharlestouitou@gmail.com
      <span class="count">
        99+
      </span>
    </a>
    <hr />
    <a @mouseover="infoContent = infoSpaces" @mouseleave="infoContent = ''">
      <Icon name="settings" color="normal" />
      Add/Remove a Space
    </a>

    <a>
      <Icon name="settings" color="normal" />
      Add/Remove an email address
    </a>


  </div>
  <div class="spaceholder">

  </div>
</template>

<style scoped>
.home-picker {
  width: 100%;
  display: grid;
  overflow: hidden;
  height: 38px;
}

.sidebar.collapsed .count {
  display: none !important;
}

.home-picker:hover {
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
  height: fit-content;
  overflow: visible;
  width: max-content;
  border: 3px solid var(--primary-background-color);
  border-left: none;
  z-index: 1;
  margin-top: 38px;
  position: absolute;
}

hr {
  margin: 0;
  background: var(--primary-background-color);
}

.home-picker:hover .count {
  margin-left: 10px;
}

.home-picker:hover+.spaceholder {
  height: 38px;
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
  overflow-y: visible;
  height: 30px;
  margin-bottom: 5px;
  letter-spacing: .3px;
}

.home-picker a:hover {
  overflow: visible;
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