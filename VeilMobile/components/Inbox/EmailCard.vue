<script lang="ts" setup>
</script>

<template>
    <div class="email-card">
        <div class="sender">
            Sender
        </div>
        <div class="date">
            Date
        </div>
        <div class="preview">
            This is the preview of the email, i don't know what it says, i'm just a CSS guy
        </div>
    </div>
</template>

<style scoped>
.email-card {
    color: var(--strong-font-color);
    position: relative;
    background: #fff;
    border-radius: 5px;
    user-select: none;
    margin-bottom: 15px;
    width: 100%;
    background: var(--secondary-background-color);
    padding: 6px;
    overflow: hidden;
    font-size: var(--body-font-size);
    contain: layout;
    transition: .2s;
    cursor: pointer;
}
</style>