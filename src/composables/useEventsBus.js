import { ref } from 'vue';

const bus = ref(new Map());

export default function useEventsBus() {
    function emit(event, ...args) {
        const next = new Map(bus.value);
        next.set(event, args);
        bus.value = next;
    }

    return {
        emit,
        bus
    };
}
