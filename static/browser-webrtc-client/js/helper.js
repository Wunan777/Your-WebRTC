/**
 *
 * @param {RTCPeerConnection} pc
 * @returns {Promise<RTCSessionDescriptionInit>} offer
 */
async function createOffer(pc) {
    let offer = null;
    try {
        /**
         * * @type {RTCOfferOptions}
         */
        let offerOptions = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };
        /**
         * * @type {RTCSessionDescriptionInit}
         */
        offer = await pc.createOffer(offerOptions);
        // set local SDP
        await pc.setLocalDescription(offer);
    } catch (error) {
        onCreateSessionDescriptionError(error);
    }
    return offer;
}

/**
 *
 * @param {RTCPeerConnection} pc
 * @returns {Promise<RTCSessionDescriptionInit>} answer
 */
async function createAnswer(pc) {
    let answer = null;
    try {
        // create answer
        /**
         * * @type {RTCSessionDescriptionInit}
         */
        answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        // pc.getTransceivers().forEach((transceiver) => {
        //     remoteDeviceIdMap.set(transceiver.mid, event.deviceId);
        // });
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
    return answer;
}

const worker = new Worker("./js/worker.js", { name: "E2EE worker" });

function setupSenderTransform(sender) {
    // if (window.RTCRtpScriptTransform) {
    //   sender.transform = new RTCRtpScriptTransform(worker, {operation: 'encode'});
    //   return;
    // }
    console.log("setupSenderTransform");
    const senderStreams = sender.createEncodedStreams();
    // Instead of creating the transform stream here, we do a postMessage to the worker. The first
    // argument is an object defined by us, the second is a list of variables that will be transferred to
    // the worker. See
    //   https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
    // If you want to do the operations on the main thread instead, comment out the code below.
    /*
    const transformStream = new TransformStream({
      transform: encodeFunction,
    });
    senderStreams.readable
        .pipeThrough(transformStream)
        .pipeTo(senderStreams.writable);
    */
    const { readable, writable } = senderStreams;
    worker.postMessage(
        {
            operation: "encode",
            readable,
            writable,
        },
        [readable, writable]
    );
}
function setupReceiverTransform(receiver) {
    // if (window.RTCRtpScriptTransform) {
    //     receiver.transform = new RTCRtpScriptTransform(worker, {
    //         operation: "decode",
    //     });
    //     return;
    // }

    console.log("setupReceiverTransform");
    const receiverStreams = receiver.createEncodedStreams();
    const { readable, writable } = receiverStreams;
    worker.postMessage(
        {
            operation: "decode",
            readable,
            writable,
        },
        [readable, writable]
    );
}
