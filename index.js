const socket = require("socket.io");
const http = require("http");
const path = require("path");
const fs = require("fs");

const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
};

function isRequestFile(req) {
    return (
        req.url.startsWith("/static/") ||
        req.url.endsWith(".js") ||
        req.url.endsWith(".css") ||
        req.url.endsWith(".jpg") ||
        req.url.endsWith(".jpeg") ||
        req.url.endsWith(".png") ||
        req.url.endsWith(".ico")
    );
}

const staticDir = path.join(__dirname, "static/browser-webrtc-client");
const server = http.createServer((req, res) => {
    console.log(`request url: ${req.url}, method: ${req.method}`);

    // 提供静态文件服务
    if (req.method === "GET" && req.url === "/") {
        const filePath = path.join(staticDir, "index.html");
        console.log(`request ${filePath}`);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("404 Not Found");
                return;
            }
            // 根据文件扩展名设置正确的 Content-Type
            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] || "application/octet-stream";
            res.writeHead(200, { "Content-Type": contentType });
            res.end(data);
        });
    } else if (req.method === "GET" && isRequestFile(req)) {
        const filePath = path.join(staticDir, req.url);
        console.log(`request ${filePath}`);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("404 Not Found");
                return;
            }

            // 根据文件扩展名设置正确的 Content-Type
            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] || "application/octet-stream";
            res.writeHead(200, { "Content-Type": contentType });
            res.end(data);
        });
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
    }
});

// hashmap: socketId - deviceId
let socketId2DeviceId = {};

const io = socket(server, {
    cors: {
        origin: "*", // 配置跨域
    },
});

// function getAllSockets() {
//     const sockets = io.sockets.sockets;
//     console.log(
//         "所有连接的客户端:",
//         Array.from(sockets.keys())
//         // Array.from(sockets.values())
//     );
//     return sockets;
// }

function getAllSokcetIds() {
    const sockets = io.sockets.sockets;
    return Array.from(sockets.keys());
}

function removeDisconnectedSocket(socketId2DeviceId) {
    let connectSocket = getAllSokcetIds();
    Object.keys(socketId2DeviceId).forEach((socketId) => {
        // lazy delete the disconnected socket
        if (!connectSocket.includes(socketId)) {
            delete socketId2DeviceId[socketId];
        }
    });
    return socketId2DeviceId;
}

function broadcastRoomInfo() {
    removeDisconnectedSocket(socketId2DeviceId);

    const devices = Object.values(socketId2DeviceId);
    console.log(`broadcastRoomInfo devices : ${devices}, ${socketId2DeviceId}`);
    io.emit("room-info", {
        devices: devices,
    });
}

/**
 * * @param {} sock
 */
io.on("connection", (sock) => {
    console.log("连接成功...");
    // 向客户端发送连接成功的消息
    sock.emit("connectionSuccess");

    // 监听客户端event
    sock.on("offer", (event) => {
        console.log(`receive offer from device : ${event.fromDeviceId}`);
        // 向其余客户端发送offer
        sock.broadcast.emit("offer", event);
    });

    sock.on("candidate", (event) => {
        console.log(`receive candidate from device : ${event.fromDeviceId}`);
        // 向其余客户端发送offer
        sock.broadcast.emit("candidate", event);
    });

    sock.on("answer", (event) => {
        console.log(
            `receive answer from deviceId : ${event.fromDeviceId}, to deviceId : ${event.toDeviceId}`
        );
        // 向其余客户端发送offer
        sock.broadcast.emit("answer", event);
    });

    sock.on("join-room", (event) => {
        console.log(`${event.deviceId} join room.`);
        socketId2DeviceId[sock.id] = event.deviceId;
        broadcastRoomInfo();
    });

    // 主动断开连接
    sock.on("disconnect", (event) => {
        let socketId = sock.id;
        console.log(`${socketId} disconnect. ${event}`);
        // delete socketId2DeviceId[socketId];
        broadcastRoomInfo();
    });
});

const host = process.env.HOST ?? "localhost";
const port = process.env.PORT ?? 3000;

server.listen(port, () => {
    console.log(`服务器启动成功, http://${host}:${port}`);
});
