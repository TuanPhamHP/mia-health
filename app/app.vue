<template>
  <!-- Chèn <link rel="manifest"> — xem ghi chú `pwa` ở nuxt.config.ts -->
  <NuxtPwaManifest />
  <UApp :toaster="{ position: 'top-right' }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
