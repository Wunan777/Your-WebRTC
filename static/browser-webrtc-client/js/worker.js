/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/*
 * This is a worker doing the encode/decode transformations to add end-to-end
 * encryption to a WebRTC PeerConnection using the Insertable Streams API.
 */

"use strict";

function encodeFunction(encodedFrame, controller) {
    const chunk = encodedFrame;
    const bytes = new Uint8Array(chunk.data);
    const offset = 4; /* leave the first 4 bytes alone in VP8 */
    for (let i = offset; i < bytes.length; i++) {
        bytes[i] = ~bytes[i]; /* XOR the rest */
    }
    controller.enqueue(chunk);
}

function decodeFunction(encodedFrame, controller) {
    const chunk = encodedFrame;
    const bytes = new Uint8Array(chunk.data);
    const offset = 4; /* leave the first 4 bytes alone in VP8 */
    for (let i = offset; i < bytes.length; i++) {
        bytes[i] = ~bytes[i]; /* XOR the rest */
    }
    controller.enqueue(chunk);
}

function handleTransform(operation, readable, writable) {
    console.log(`handleTransform: ${operation}`);
    if (operation === "encode") {
        const transformStream = new TransformStream({
            transform: encodeFunction,
        });
        readable.pipeThrough(transformStream).pipeTo(writable);
    } else if (operation === "decode") {
        const transformStream = new TransformStream({
            transform: decodeFunction,
        });
        readable.pipeThrough(transformStream).pipeTo(writable);
    }
}
// Handler for messages, including transferable streams.
onmessage = (event) => {
    console.log(`worker: onmessage`, event);
    if (
        event.data.operation === "encode" ||
        event.data.operation === "decode"
    ) {
        return handleTransform(
            event.data.operation,
            event.data.readable,
            event.data.writable
        );
    }
};

// Handler for RTCRtpScriptTransforms.
// if (self.RTCTransformEvent) {
//   self.onrtctransform = (event) => {
//     const transformer = event.transformer;
//     handleTransform(transformer.options.operation, transformer.readable, transformer.writable);
//   };
// }
