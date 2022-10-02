<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    required: false
  },
  active: {
    type: Boolean,
    required: false,
  }
})
</script>


<template>
  <a :class="active ? 'active' : ''">
    <img src="@Veil/assets/icons/sidebar/home.svg" class="icon" alt="Home" />
    {{text}}
    <span class="count">
      99+
    </span>
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