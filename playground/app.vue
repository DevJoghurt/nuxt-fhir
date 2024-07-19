<template>
    <div>
        <h1>Playground</h1>
        <p>Here you can test your code</p>
    </div>
</template>
<script setup lang="ts">
    let ws: WebSocket | undefined;

    const subscribe = async () => {
        const isSecure = location.protocol === "https:"
        const url = (isSecure ? "wss://" : "ws://") + location.host + "/_ws/echo"
        console.log("ws", "Connecting to", url, "...")
        ws = new WebSocket(url)
        ws.addEventListener("message", (event) => {
            console.log(event)
        })
        await new Promise((resolve) => ws!.addEventListener("open", resolve))
    }

    onMounted(async ()=>{
        await subscribe()
    })

    onBeforeUnmount(()=>{
        ws?.close()
    })
</script>