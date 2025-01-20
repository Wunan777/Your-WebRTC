/**
 * Before you start, Setup your own Signaling Server, and STUN/TURN Server
 */

const STUN_URL = "";
const TURN_URL = "";
const TURN_USERNAME = "";
const TURN_CREDENTIAL = "";
const SIGNALING_URL = "";

// 全局捕获未处理的 Promise 拒绝
window.addEventListener("unhandledrejection", function (event) {
    console.error("Unhandled promise rejection:", event);
    // 你可以在这里添加自定义的错误处理逻辑，例如记录错误日志或显示错误提示
});

// 全局捕获未捕获的异常
window.addEventListener("error", function (event) {
    console.error("Uncaught error:", event);
    // 你可以在这里添加自定义的错误处理逻辑，例如记录错误日志或显示错误提示
});

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const startButton = document.getElementById("startButton");
const callButton = document.getElementById("callButton");
const hangupButton = document.getElementById("hangupButton");
callButton.disabled = true;
hangupButton.disabled = true;
startButton.addEventListener("click", start);
callButton.addEventListener("click", call);
hangupButton.addEventListener("click", hangup);

const deviceId = "pc" + Math.floor(Math.random() * 10000);

/**
 * * @type {RTCPeerConnection}
 */
let pc = null;
let localstream = null;
/**
 * @type {SocketIOClient.Socket}
 */
let sock = null;

async function start() {
    startButton.disabled = true;
    callButton.disabled = false;
    hangupButton.disabled = false;
    // 4 . Get local stream
    /**
     * @type {MediaStream}
     */
    localstream = await getLocalStream();

    startTime = window.performance.now();
}

async function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    // 1. RTCPeerConnection
    // if pc close , create new pc
    initPC();

    // 2. Add local stream to connection and create offer
    if (localstream) {
        /**
         * track @type {MediaStreamTrack}
         */
        localstream.getTracks().forEach((track) => {
            try {
                console.log("add track", track, pc.getTransceivers());
                /**
                 * RTCRtpSender
                 */
                const sender = pc.addTrack(track, localstream);
            } catch (error) {
                console.error("add track error: ", error);
            }
        });

        pc.getSenders().forEach(setupSenderTransform);
    } else {
        alert("localstream unable to add track");
        return;
    }

    // 3. Create offer SDP
    // set remote SDP
    // send to remote
    let offer = await createOffer(pc);
    console.log("send offer: ", offer);
    sock.emit("offer", {
        offer: offer,
        fromDeviceId: deviceId,
        toDreviceId: "all",
    });
}

function hangup() {
    callButton.disabled = false;
    hangupButton.disabled = true;
    pc.close();
}

/**
 * @Return {MediaStream}
 */
async function getLocalStream() {
    console.log("Requesting local stream");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        console.log("Received local stream");
        localVideo.srcObject = stream;
        return stream;
    } catch (e) {
        alert(`getUserMedia() error: ${e.name}`);
        return null;
    }
}

// console.log("Hi, I am " + deviceId);
function initSignaling() {
    const roomId = "room001";
    sock = io(SIGNALING_URL); // 对应服务的端口

    // handle socket events
    sock.on("connectionSuccess", () => {
        console.log("连接服务器成功...");
        // 前端发送加入房间事件
        sock.emit("join-room", {
            deviceId: deviceId,
        });
    });

    sock.on("room-info", (event) => {
        console.log("room info: ", event);
    });

    sock.on("offer", async (event) => {
        let remoteDeviceId = event.fromDeviceId;
        if (remoteDeviceId != deviceId) {
            // offer from remote peer, set remote SDP
            console.log("receive remote offer: ", event.offer);
            await pc.setRemoteDescription(event.offer);
            //
            const answer = await createAnswer(pc);
            console.log("send answer: ", answer);
            sock.emit("answer", {
                answer: answer,
                fromDeviceId: deviceId,
                toDeviceId: remoteDeviceId,
            });
        } else {
            // offer from local peer
            // no deal.
        }
    });

    sock.on("answer", async (event) => {
        try {
            if (event.toDeviceId == deviceId) {
                // answer from remote peer, set remote SDP
                console.log(
                    `receive remote device ${event.fromDeviceId} to device ${deviceId} answer: ${event.answer}`
                );
                await pc.setRemoteDescription(event.answer);
            } else {
                // answer from local peer, or answer not response for this device
                // no deal.
            }
        } catch (e) {
            onCreateSessionDescriptionError(e);
        }
    });

    sock.on("candidate", async (event) => {
        let remoteDeviceId = event.fromDeviceId;
        let candidate = event.candidate;

        if (remoteDeviceId != deviceId) {
            // candidate from remote peer
            // set remote candidate
            console.log(
                `receive remote device ${event.fromDeviceId} candidate: ${candidate}`
            );
            if (candidate) {
                if (candidate.type == "relay") {
                    console.log("receive relay candidate", candidate);
                }
                await pc.addIceCandidate(candidate);
            } else {
                console.log("receive end candidate");
            }
        } else {
            // candidate from local peer
            // no deal.
        }
    });
}

function initPC() {
    if (pc && pc.connectionState !== "closed") {
        return;
    }

    // 1. RTCPeerConnection
    pc = new RTCPeerConnection({
        encodedInsertableStreams: true, // needed by chrome shim
        iceServers: [
            {
                // default "stun:stun.l.google.com:19302",
                urls: STUN_URL,
            },
            {
                urls: TURN_URL,
                username: TURN_USERNAME,
                credential: TURN_CREDENTIAL,
            },
        ],
    });

    // 2. Listen for events
    /**
     *  @param {RTCPeerConnectionIceEvent} e
     */
    pc.addEventListener("icecandidate", (e) => {
        let candidate = e.candidate;
        console.log("pc ICE candidate: ", candidate);

        if (candidate) {
            console.log("send candidate: ", candidate);
            sock.emit("candidate", {
                candidate: candidate,
                fromDeviceId: deviceId,
                toDeviceId: "all",
            });
        } else {
            console.log("End of candidates.");
        }
    });
    // 监听 ICE 连接状态变化
    pc.addEventListener("iceconnectionstatechange", (e) => {
        console.log(`${deviceId} ICE state: ${pc.iceConnectionState}`);
        console.log("ICE state change event: ", e);
        onIceConnectionStateChange(pc);
    });

    // 监听整体连接状态变化
    pc.addEventListener("connectionstatechange", () => {
        onConnectionstatechange(pc, remoteVideo);
    });

    // 监听信令状态变化
    pc.addEventListener("signalingstatechange", (e) => {
        console.log(`${deviceId} Signaling state: ${pc.signalingState}`);
    });
    /**
     * @param {RTCTrackEvent} e
     */
    pc.addEventListener("track", (e) => {
        console.log("receive track: ", e);
        if (e.streams.length == 0) {
            return;
        }

        // add remote stream
        setupReceiverTransform(e.receiver);
        remoteVideo.srcObject = e.streams[0];
    });
}

function actionConnect() {
    // track -> transceiver -> peer  -> device
    // 初始化RTCPeerConnection
    initPC();
    // 连接信令服务
    initSignaling();
}

// 创建
actionConnect();

// 销毁
window.addEventListener("beforeunload", () => {
    pc.close();
    sock.disconnect();
});
