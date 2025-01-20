const chromeCfg = { encodedInsertableStreams: true }; // needed by chrome shim

let pc1 = new RTCPeerConnection(chromeCfg),
    pc2 = new RTCPeerConnection(chromeCfg);

start.onclick = async () => {
    pc1.onicecandidate = (e) => pc2.addIceCandidate(e.candidate);
    pc2.onicecandidate = (e) => pc1.addIceCandidate(e.candidate);
    pc1.oniceconnectionstatechange = () => console.log(pc1.iceConnectionState);
    pc1.onnegotiationneeded = async () => {
        await pc1.setLocalDescription();
        await pc2.setRemoteDescription(pc1.localDescription);
        await pc2.setLocalDescription();
        await pc1.setRemoteDescription(pc2.localDescription);
    };
    video1.srcObject = await navigator.mediaDevices.getUserMedia({
        video: true,
    });
    const sender = pc1.addTrack(
        video1.srcObject.getTracks()[0],
        video1.srcObject
    );
    sender.transform = new RTCRtpScriptTransform(worker, { side: "send" });

    video2.srcObject = (await new Promise((r) => (pc2.ontrack = r))).streams[0];
    const [receiver] = pc2.getReceivers();
    receiver.transform = new RTCRtpScriptTransform(worker, { side: "receive" });
};

descramble.onclick = () => {
    worker.postMessage({ descramble: descramble.checked });
};

stap.onclick = () => {
    video1.srcObject.getTracks().forEach((track) => track.stop());
    video2.srcObject.getTracks().forEach((track) => track.stop());
    pc1.close();
    pc2.close();
    pc1 = new RTCPeerConnection(chromeCfg);
    pc2 = new RTCPeerConnection(chromeCfg);
};

// The rest is in a worker:

const worker = new Worker(`data:text/javascript,(${work.toString()})()`);
function work() {
    let descramble = true;
    onmessage = ({ data }) => {
        if ("descramble" in data) descramble = data.descramble;
        if ("rtctransform" in data)
            onrtctransform({
                transformer: data.rtctransform,
            }); /* needed by chrome shim: */
    };

    onrtctransform = async ({
        transformer: { readable, writable, options },
    }) => {
        await readable
            .pipeThrough(new TransformStream({ transform }))
            .pipeTo(writable);

        function transform(chunk, controller) {
            const bytes = new Uint8Array(chunk.data);
            const offset = 4; /* leave the first 4 bytes alone in VP8 */
            for (let i = offset; i < bytes.length; i++) {
                bytes[i] = ~bytes[i]; /* XOR the rest */
            }
            if (options.side == "receive" && !descramble) {
                for (let i = offset + 10; i < offset + 12; i++) {
                    bytes[i] = ~bytes[i]; /* reverse a few XOR for spectacle */
                }
            }
            controller.enqueue(chunk);
        }
    };
}
