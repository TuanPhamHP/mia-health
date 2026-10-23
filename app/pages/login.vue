<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  // Trang public — không dùng layout default (vì layout có tab bar đòi user đã login).
  layout: false,
})

useHead({ title: 'Đăng nhập — Mia Health' })

const route = useRoute()
const router = useRouter()
const { fetch: refreshSession } = useUserSession()

const password = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)

async function submit() {
  if (!password.value) {
    error.value = 'Nhập password'
    return
  }
  submitting.value = true
  error.value = null
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value },
    })
    await refreshSession()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Đăng nhập thất bại'
    // FetchError có statusMessage chi tiết hơn — ưu tiên dùng
    const fetchErr = e as { statusMessage?: string; data?: { message?: string } }
    error.value = fetchErr.data?.message ?? fetchErr.statusMessage ?? msg
    password.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] flex flex-col items-center justify-center bg-(--ui-bg) px-6">
    <div class="w-full max-w-sm">
      <div class="flex flex-col items-center gap-3 mb-8">
        <div class="flex size-14 items-center justify-center rounded-2xl bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-heart" class="size-7 text-(--ui-primary)" />
        </div>
        <h1 class="text-xl font-semibold text-(--ui-text-highlighted)">Mia Health</h1>
        <p class="text-sm text-(--ui-text-muted) text-center">
          Nhập password để vào lịch tập cá nhân
        </p>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <UInput
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Password"
          autocomplete="current-password"
          class="w-full"
          size="lg"
          :ui="{ base: 'text-base' }"
          autofocus
          :disabled="submitting"
        >
          <template #trailing>
            <UButton
              :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="showPassword ? 'Ẩn password' : 'Hiện password'"
              @click="() => { showPassword = !showPassword }"
            />
          </template>
        </UInput>

        <p
          v-if="error"
          class="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {{ error }}
        </p>

        <UButton
          type="submit"
          color="primary"
          variant="solid"
          size="lg"
          class="w-full justify-center"
          :loading="submitting"
        >
          Đăng nhập
        </UButton>
      </form>

      <p class="mt-6 text-center text-xs text-(--ui-text-muted)">
        Session giữ 30 ngày — tự refresh mỗi khi dùng app
      </p>
    </div>
  </div>
</template>
