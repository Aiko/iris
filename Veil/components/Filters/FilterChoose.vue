<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
import { ref } from 'vue'

let isOpen = ref(false);
const toggleMenu = () => (isOpen.value = !isOpen.value);
</script>

<template>
    <div class="filter-choose" :class="{ 'isOpen': isOpen }">
        <div :class="{
            'menu-container': true,
            'is-open': isOpen,
        }" @click="toggleMenu" tabindex="0" @focusout="isOpen = false" autofocus>



            <div class="filter-choose-item">
                Black
            </div>
            <div class="filter-choose-item">
                White
            </div>
            <div class="filter-choose-item">
                Yellow
            </div>
            <div class="filter-choose-item">
                Blue
            </div>



            <slot v-if="isOpen" class="overflow-scroll"></slot>
            <Icon name="roundedx" color="normal" class="icon" v-if="isOpen" />
            <Icon name="down" color="normal" class="icon" v-if="!isOpen" />

        </div>
    </div>
</template>

<style lang="scss" scoped>
.filter-choose {
    background-color: var(--primary-background-color);
    border-radius: var(--primary-border-radius);
    border: 1px solid var(--primary-background-color) !important;
    color: var(--primary-font-color);
    outline: none !important;
    width: 100%;
    cursor: pointer;
    height: 30px;
    position: relative;
    user-select: none;
    overflow: hidden;
}

.isOpen {
    overflow: unset;
}

.filter-choose-item {
    margin: 0px;
    padding: 3px 6px;
    border-radius: var(--primary-border-radius);
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 14px;
    width: calc(100% + 1px);
    overflow: hidden;
    opacity: .8;
    transition: .2s;
}

.filter-choose-item:hover {
    opacity: 1;
    transition: .2s;
}

.label {
    padding-right: 25px;
    pointer-events: none;
}

.menu-container {
    width: 100%;
    left: 0;
    position: absolute;
    outline: none;
    border: 1px solid transparent;
    border-radius: var(--primary-border-radius);
}

.overflow-scroll {
    overflow-y: scroll;
}

.is-open {
    background: var(--p-opaque);
    border: 1px solid var(--secondary-background-color) !important;
    z-index: 1000;
}

.icon {
    position: absolute;
    top: 0;
    right: 0;
    pointer-events: none;
    margin: 4px 4px;
    width: 20px;
}

.right .icon {
    transform: rotate(-90deg);
}

.left .icon {
    transform: rotate(90deg);
}

.top .icon {
    transform: rotate(180deg);
}

.normal {}

.down {}

.top .menu-container {
    position: absolute;
    bottom: 0;
    margin: 0;
    padding-bottom: 35px;
}

.top .label {
    position: absolute;
    bottom: 0;
}

.top .icon {
    top: unset;
    bottom: 0;
}

.left {}
</style>