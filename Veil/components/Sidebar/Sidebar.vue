<script lang="ts" setup>
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import NavLink from '@Veil/components/Sidebar/NavLink.vue';
import NavLinkHome from '@Veil/components/Sidebar/NavLinkHome.vue';
</script>

<template>
  <div class="sidebar">
    <div class="top">
      <ButtonPrimary text="Compose" />
      <NavLinkHome text="Home" active />
      <NavLink text="Sent" />
      <NavLink text="Drafts" />
      <NavLink text="Archive" />
      <NavLink text="Spam" />
      <NavLink text="Trash" />
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 130px;
  height: 100%;
  background-color: var(--primary-background-color);
  padding: 8px;
  box-shadow: var(--sidebar-shadow);
  z-index: 1;
}

.sidebar .top {
  display: grid;
}
</style>