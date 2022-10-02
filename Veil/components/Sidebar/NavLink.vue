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
    <img src="@Veil/assets/icons/sidebar/sent.svg" v-if="text == 'Sent'" class="icon" alt="Sent" />
    <img src="@Veil/assets/icons/sidebar/drafts.svg" v-if="text == 'Drafts'" class="icon" alt="Drafts" />
    <img src="@Veil/assets/icons/sidebar/archive.svg" v-if="text == 'Archive'" class="icon" alt="Archive" />
    <img src="@Veil/assets/icons/sidebar/spam.svg" v-if="text == 'Spam'" class="icon" alt="Spam" />
    <img src="@Veil/assets/icons/sidebar/trash.svg" v-if="text == 'Trash'" class="icon" alt="Trash" />
    {{text}}


    <!-- TODO: Number here for unread
    <span class="count">
      3
    </span>
    -->


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
  font-size: 13px;
  text-align: center;
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
}

.active .count {
  background: var(--primary-background-color);
}
</style>