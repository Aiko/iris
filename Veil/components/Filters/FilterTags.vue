<script lang="ts" setup>

const props = defineProps<{
  preview?: number;
}>()

</script>

<template>
  <!--START Single Listogram (add 'active' class)-->
  <div class="filter-tags">Orange</div>
  <!--END Single Listogram-->

  <div class="filter-tags">Black</div>
  <div class="filter-tags active">Blue</div>
  <div class="filter-tags">Yellow</div>
  <div class="filter-tags">Green</div>
  <div class="filter-tags">Milky</div>


  <!--Show more button-->
  <div class="filter-show-more">Show more</div>
</template>

<style lang="scss" scoped>
.filter-tags {
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  padding: 2px 6px;
  border: 1px solid var(--primary-background-color);
  margin-right: 4px;
  margin-bottom: 4px;
  opacity: .8;
  display: inline-block;
  color: var(--primary-font-color);
  font-size: 14px;
  cursor: pointer;
  transition: .2s;
}

.filter-tags:hover {
  opacity: 1;
  transition: .2s;
}

.active {
  opacity: 1;
  transition: .2s;
  border: 1px solid var(--primary-font-color);
}

.filter-show-more {
  width: 100%;
  text-align: center;
  color: var(--primary-font-color);
  font-size: 13px;
  cursor: pointer;
  margin-top: 10px;
  transition: .2s;
  border: 1px solid var(--primary-background-color);
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  padding: 2px;
  opacity: .8;
}

.filter-show-more:hover {
  opacity: 1;
  transition: .2s;
}
</style>
