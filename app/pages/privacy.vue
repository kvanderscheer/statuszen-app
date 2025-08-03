<script setup lang="ts">
definePageMeta({
  layout: 'top-nav'
})

const { data: page } = await useAsyncData(() => queryCollection('content').path('/privacy').first())

useSeoMeta({
  title: page.value?.title,
  description: page.value?.description
})
</script>

<template>
  <div class="prose prose-primary dark:prose-invert mt-12 mx-auto max-w-screen-md px-4">
    <ContentRenderer
      v-if="page"
      :value="page"
    />
    <div v-else>
      Page not found
    </div>
  </div>
</template>
