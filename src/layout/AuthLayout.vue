<script setup>
import Logo from '@/assets/images/logo.png';
</script>

<template>
    <div
        class="min-h-screen flex items-center justify-center bg-[#F6F9FB] overflow-x-hidden py-10"
    >
        <div class="w-full max-w-[500px]">
            <div class="text-center mb-4 pb-1">
                <img :src="Logo" width="130" class="inline-block" />
            </div>
            <div
                class="bg-white custom-shadow rounded-lg text-gray-800 px-[2.25rem] sm:px-[1.75rem] py-[2rem]"
            >
                <router-view />
            </div>
            <div class="text-center font-lg text-gray-500 mt-5 leading-6">
                {{ $t('servicore_by_intelygic') }} <br />
                <a
                    href="http://www.intelygic.com"
                    class="font-semibold primary-text"
                    target="_blank"
                    >www.intelygic.com</a
                >
            </div>
        </div>
        <Toast />
    </div>
</template>
<style scoped>
.custom-shadow {
    box-shadow: 0 0 15px 5px rgba(0, 0, 0, 0.1);
}
</style>
