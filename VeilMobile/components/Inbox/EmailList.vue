<script lang="ts" setup>
import EmailCard from "./EmailCard.vue";
</script>

<template>
    <div class="email-list">
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />
        <EmailCard />

    </div>
</template>

<style scoped>
.email-list {
    margin-top: 50px;
    padding: 20px 10px;
    background: var(--primary-background-color);
    overflow-y: scroll;
    height: calc(100% - 100px);
}
</style>