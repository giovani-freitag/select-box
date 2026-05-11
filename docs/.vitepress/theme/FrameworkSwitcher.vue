<script setup lang="ts">
import { ref } from "vue";

interface Frame {
    label: string;
    src: string;
}

const props = defineProps<{ frames: Frame[] }>();

const activeIndex = ref(0);
</script>

<template>
    <div class="framework-switcher">
        <div class="framework-tabs" role="tablist">
            <button
                v-for="(frame, index) in props.frames"
                :key="frame.label"
                type="button"
                role="tab"
                :aria-selected="activeIndex === index"
                :class="['framework-tab', { active: activeIndex === index }]"
                @click="activeIndex = index"
            >
                {{ frame.label }}
            </button>
        </div>
        <div class="framework-frame-wrapper">
            <iframe
                v-for="(frame, index) in props.frames"
                v-show="activeIndex === index"
                :key="frame.label"
                :src="frame.src"
                :title="`${frame.label} demo`"
                class="framework-frame"
                loading="lazy"
            ></iframe>
        </div>
    </div>
</template>

<style scoped>
.framework-switcher {
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    overflow: hidden;
    margin: 1.5rem 0;
}

.framework-tabs {
    display: flex;
    gap: 0;
    background: var(--vp-c-bg-soft);
    border-bottom: 1px solid var(--vp-c-divider);
}

.framework-tab {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    color: var(--vp-c-text-2);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
}

.framework-tab:hover {
    color: var(--vp-c-text-1);
}

.framework-tab.active {
    color: var(--vp-c-brand-1);
    border-bottom-color: var(--vp-c-brand-1);
}

.framework-frame-wrapper {
    position: relative;
    width: 100%;
    min-height: 360px;
    background: var(--vp-c-bg);
}

.framework-frame {
    display: block;
    width: 100%;
    height: 420px;
    border: none;
    background: transparent;
}
</style>
