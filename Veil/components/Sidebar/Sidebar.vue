<script lang="ts" setup>
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import NavLink from '@Veil/components/Sidebar/NavLink.vue';
import NavLinkHome from '@Veil/components/Sidebar/NavLinkHome.vue';
</script>

<template>
  <div class="sidebar">
    <div class="top">
      <ButtonPrimary text="Compose" class="compose" />
      <NavLinkHome text="Home" active />
      <NavLink text="Sent" />
      <NavLink text="Drafts" />
      <NavLink text="Archive" />
      <NavLink text="Spam" />
      <NavLink text="Trash" />
    </div>
    <div class="bottom">
      <a><img src="@Veil/assets/icons/Header/calendar.svg" class="icon" /></a>
      <a><img src="@Veil/assets/icons/Header/settings.svg" class="icon" /></a>
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
  border-top-right-radius: var(--primary-border-radius);
}

.compose {
  margin-top: 0;
}

.sidebar .top {
  display: grid;
}

.bottom {
  margin-bottom: 20px;
  position: absolute;
  bottom: 0;
  left: 0;
  margin-left: 20px;
}

.bottom a {
  background: var(--secondary-background-color);
  padding: 3px 5px 7px 5px;
  border-radius: var(--primary-border-radius);
  margin-left: 10px;
}

.bottom img {
  width: 20px;
}
</style>