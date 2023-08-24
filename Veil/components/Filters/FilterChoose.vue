<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
</script>

<template>
    <select class="filter-choose">
        <option value="">Choose an option</option>
        <option value="black">Black</option>
        <option value="white">White</option>
        <option value="Orange">Orange</option>
    </select>
</template>

<style lang="scss" scoped>
.filter-choose {
    width: 100%;
    margin-top: 1px;
    text-align: left;
    color: var(--primary-font-color);
    font-size: 13px;
    border: 1px solid var(--primary-background-color);
    transition: .2s;
    background-color: var(--primary-background-color);
    border-radius: var(--primary-border-radius);
    padding: 3px 7px;
    white-space: nowrap;
    overflow: scroll;
    cursor: text;
    height: 30px;
    outline: none;
    opacity: .8;
}

.filter-choose:hover {
    opacity: 1;
    transition: .2s;
}
</style>