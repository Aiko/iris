<script lang="ts" setup>
const props = defineProps<{
    min: number;
    max: number;
}>()

const mid = (props.min + props.max) / 2
</script>

<template>
    <div class="filter-slider">
        <div class="filter-slider-label">112</div>
        <input type="range" :min="min" :max="max" :value="mid" class="slider">
    </div>
</template>

<style lang="scss" scoped>
/* The slider itself */
.slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 5px;
    cursor: pointer;
    background: var(--primary-background-color);
    outline: none;
    opacity: 0.8;
    -webkit-transition: .2s;
    transition: opacity .2s;
}

/* Mouse-over effects */
.slider:hover {
    opacity: 1;
}

/* The slider handle (use -webkit- (Chrome, Opera, Safari, Edge) and -moz- (Firefox) to override default look) */
.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--strong-font-color);
    cursor: pointer;
}

.slider::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--strong-font-color);
    cursor: pointer;
}

.filter-slider-label {
    color: var(--primary-font-color);
    font-size: 14px;
    opacity: .6;
    margin-top: -20px;
    margin-bottom: -20px;
    float: right;
}
</style>
