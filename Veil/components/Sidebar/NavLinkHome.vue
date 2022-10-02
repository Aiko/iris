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
  <div class="home-picker">

    <a :class="active ? 'active' : ''" title="All your inboxes">
      <img src="@Veil/assets/icons/sidebar/home.svg" class="icon" />
      {{text}}
      <span class="count">
        99+
      </span>
    </a>

    <a :class="active ? 'active' : ''" title="Custom space">
      <img src="@Veil/assets/icons/sidebar/home.svg" class="icon" />
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
  height: 38px;
  overflow: hidden;

}

.home-picker:hover {
  height: fit-content;
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
  margin-top: 3px;
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