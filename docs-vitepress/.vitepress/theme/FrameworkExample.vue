<script setup lang="ts">
import { useData } from "vitepress";
import { computed, ref, watch } from "vue";

interface Framework {
    readonly id: string;
    readonly label: string;
    /**
     * Path to the framework's example HTML, served by VitePress's own
     * Vite dev server (and rolled up as an additional entry at build).
     * Typically `/examples/<id>/index.html`.
     */
    readonly src: string;
}

const props = defineProps<{ frameworks: ReadonlyArray<Framework> }>();

const { isDark } = useData();
const activeId = ref<string>(props.frameworks[0]?.id ?? "");
const iframeRefs = new Map<string, HTMLIFrameElement>();

const resolvedFrameworks = computed(() =>
    props.frameworks.map((framework) => ({
        ...framework,
        urlWithTheme: appendThemeParam(framework.src, isDark.value),
    })),
);

watch(isDark, (dark) => {
    const theme = dark ? "dark" : "light";
    for (const iframe of iframeRefs.values()) {
        iframe.contentWindow?.postMessage({ type: "select-box-theme", value: theme }, "*");
    }
});

function appendThemeParam(src: string, dark: boolean): string {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}theme=${dark ? "dark" : "light"}`;
}

function registerIframe(id: string, element: Element | null): void {
    if (element instanceof HTMLIFrameElement) {
        iframeRefs.set(id, element);
    } else {
        iframeRefs.delete(id);
    }
}

function selectFramework(id: string): void {
    activeId.value = id;
}
</script>

<template>
    <div class="framework-example">
        <div class="framework-example-tabs" role="tablist">
            <button
                v-for="framework in resolvedFrameworks"
                :key="framework.id"
                type="button"
                role="tab"
                :aria-selected="activeId === framework.id"
                :class="['framework-example-tab', { active: activeId === framework.id }]"
                @click="selectFramework(framework.id)"
            >
                {{ framework.label }}
            </button>
        </div>

        <div class="framework-example-panel">
            <div class="framework-example-preview">
                <iframe
                    v-for="framework in resolvedFrameworks"
                    v-show="activeId === framework.id"
                    :key="framework.id"
                    :ref="(element) => registerIframe(framework.id, element as Element | null)"
                    :src="framework.urlWithTheme"
                    :title="`${framework.label} preview`"
                    class="framework-example-iframe"
                    loading="lazy"
                ></iframe>
            </div>
            <div class="framework-example-code">
                <div
                    v-for="framework in props.frameworks"
                    v-show="activeId === framework.id"
                    :key="framework.id"
                >
                    <slot :name="`${framework.id}-code`" />
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.framework-example {
    margin: 1.5rem 0;
}

.framework-example-tabs {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--vp-c-divider);
}

.framework-example-tab {
    position: relative;
    padding: 0.5rem 0;
    margin-bottom: -1px;
    background: transparent;
    border: none;
    color: var(--vp-c-text-2);
    font: inherit;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s;
}

.framework-example-tab:hover {
    color: var(--vp-c-text-1);
}

.framework-example-tab.active {
    color: var(--vp-c-text-1);
}

.framework-example-tab.active::after {
    content: "";
    position: absolute;
    inset-inline: 0;
    bottom: -1px;
    height: 2px;
    background: var(--vp-c-brand-1);
}

.framework-example-panel {
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    overflow: hidden;
    background: var(--vp-c-bg);
}

.framework-example-preview {
    background: var(--vp-c-bg);
    border-bottom: 1px solid var(--vp-c-divider);
}

.framework-example-iframe {
    display: block;
    width: 100%;
    height: 380px;
    border: none;
    background: transparent;
}

.framework-example-code :is(div[class*="language-"]) {
    margin: 0;
    border-radius: 0;
    border: none;
}
</style>
