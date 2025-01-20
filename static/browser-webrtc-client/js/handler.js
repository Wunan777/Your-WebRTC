function onSetLocalSuccess(pc) {
    console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
    console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
    console.log(`Failed to set session description: ${error.toString()}`);
}

function onAddIceCandidateSuccess(pc) {
    console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
    console.log(
        `${getName(pc)} failed to add ICE Candidate: ${error.toString()}`
    );
}

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
}

/**
 *
 * @param {RTCPeerConnection} pc
 */
function onIceConnectionStateChange(pc) {
    if (
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
    ) {
        pc.getStats(null).then((stats) => {
            console.log("conncetion stats", stats);
            /**
             * @param {RTCStatsReport} report
             */
            stats.forEach((report) => {
                if (
                    report.type === "candidate-pair" &&
                    report.state === "succeeded"
                ) {
                    const localCandidate = stats.get(report.localCandidateId);
                    const remoteCandidate = stats.get(report.remoteCandidateId);
                    if (localCandidate && remoteCandidate) {
                        console.log(
                            "Local candidate type:",
                            localCandidate.candidateType
                        );
                        console.log(
                            "Remote candidate type:",
                            remoteCandidate.candidateType
                        );

                        if (
                            localCandidate.candidateType === "relay" ||
                            remoteCandidate.candidateType === "relay"
                        ) {
                            console.log("Connection is using TURN server.");
                        } else {
                            console.log("Connection is P2P.");
                        }
                    }
                }
            });
        });
    } else {
        console.log(`ICE state: ${pc.iceConnectionState}`);
    }
}

/**
 *
 * @param {RTCPeerConnection} pc
 * @param {HTMLVideoElement} remoteVideo
 */
function onConnectionstatechange(pc, remoteVideo) {
    console.log("Connection state: ", pc.connectionState);
    if (pc.connectionState === "connected") {
        console.log("Peer connection established successfully");
    } else if (pc.connectionState === "failed") {
        console.error("Peer connection failed ");
    } else if (pc.connectionState === "disconnected") {
        console.log("Peer connection disconnected");

        //
        remoteVideo.pause();
        remoteVideo.removeAttribute("src"); // empty source
        remoteVideo.load();
    }
}
