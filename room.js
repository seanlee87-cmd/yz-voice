// =========================================================
// YZ VOICE
// ROOM.JS - COMPLETE CLEAN VERSION
// =========================================================

import {
    authFetch,
    requireUser,
    db,
    uploadRoomBackground
} from "./auth-client.js";


import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


import {
    GIFTS
} from "./gifts.js";



// =========================================================
// ROOM PARAMS
// =========================================================

const params =
    new URLSearchParams(
        window.location.search
    );


const roomId =
    params.get("id");



// =========================================================
// GLOBAL STATE
// =========================================================

let livekitRoom = null;

let roomInfo = null;

let me = null;

let mySeat = null;

let microphoneEnabled = false;

let speakerVolume = 1;

let selectedGiftReceiver = null;



// =========================================================
// MICROPHONE AUDIO STATE
// =========================================================

let rawMicStream = null;

let micAudioContext = null;

let micSource = null;

let micGain = null;

let micDestination = null;

let publishedMicTrack = null;



// =========================================================
// REMOTE AUDIO
// =========================================================

const remoteAudioElements =
    new Map();



// =========================================================
// CHAT
// =========================================================

const CHAT_TOPIC =
    "yz-chat";


const GIFT_TOPIC =
    "yz-gift";



// =========================================================
// HELPERS
// =========================================================

function $(id) {

    return document.getElementById(
        id
    );

}


function isConnected() {

    return (
        livekitRoom &&
        livekitRoom.state ===
            LivekitClient
                .ConnectionState
                .Connected
    );

}


function avatarFallback(seed) {

    return (
        "https://api.dicebear.com/9.x/thumbs/svg?seed=" +
        encodeURIComponent(
            seed || "YZ"
        )
    );

}


function participantName(
    participant
) {

    return (
        participant.name ||
        participant.attributes?.nickname ||
        participant.identity ||
        "用户"
    );

}


function participantAvatar(
    participant
) {

    return (
        participant.attributes?.avatar_url ||
        avatarFallback(
            participant.identity
        )
    );

}



// =========================================================
// REQUIRE LOGIN + JOIN ROOM
// =========================================================

async function joinRoom() {

    await requireUser();


    if (!roomId) {

        throw new Error(
            "缺少房间 ID"
        );

    }


    let password =
        "";


    // =====================================================
    // 第一次尝试进入
    // =====================================================

    let response =
        await authFetch(
            "/api/rooms/join",
            {

                method:
                    "POST",

                body:
                    JSON.stringify({

                        roomId,

                        password

                    })

            }
        );


    // =====================================================
    // 有密码的话询问
    // =====================================================

    if (
        response.status ===
        401
    ) {

        password =
            prompt(
                "请输入房间密码："
            ) || "";


        response =
            await authFetch(
                "/api/rooms/join",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            roomId,

                            password

                        })

                }
            );

    }


    const data =
        await response.json();


    if (!response.ok) {

        if (
            data.error ===
            "WRONG_ROOM_PASSWORD"
        ) {

            throw new Error(
                "房间密码不正确"
            );

        }


        throw new Error(
            data.error ||
            "进入房间失败"
        );

    }



    // =====================================================
    // SAVE DATA
    // =====================================================

    roomInfo =
        data.room;


    me =
        data.me;



    // =====================================================
    // ROOM TITLE
    // =====================================================

    if (
        $("room-title")
    ) {

        $("room-title")
            .textContent =
            roomInfo.title;

    }



    // =====================================================
    // ROOM BACKGROUND
    // =====================================================

    applyRoomBackground(
        roomInfo.backgroundUrl
    );



    // =====================================================
    // LOAD OWNER PROFILE
    // =====================================================

    await loadRoomOwner();



    // =====================================================
    // CREATE LIVEKIT ROOM
    // =====================================================

    livekitRoom =
        new LivekitClient.Room({

            adaptiveStream:
                true,

            dynacast:
                true,


            publishDefaults: {

                audioPreset:
                    LivekitClient
                        .AudioPresets
                        .musicHighQualityStereo,

                dtx:
                    false,

                red:
                    true

            }

        });



    // =====================================================
    // EVENTS
    // =====================================================

    bindLiveKitEvents();



    // =====================================================
    // CONNECT
    // =====================================================

    await livekitRoom.connect(
        data.url,
        data.token
    );



    // =====================================================
    // 给自己写入头像/昵称属性
    // 不等到上麦才写
    // =====================================================

    await livekitRoom
        .localParticipant
        .setAttributes({

            voice_seat:
                "",

            avatar_url:
                me.avatarUrl ||
                "",

            nickname:
                me.nickname ||
                ""

        });



    updateOnline();


    renderSeats();


    renderManageTools();


    console.log(
        "✅ LiveKit 已连接"
    );


    console.log(
        "房间：",
        livekitRoom.name
    );


    console.log(
        "用户：",
        me
    );

}



// =========================================================
// LOAD ROOM OWNER
// =========================================================

async function loadRoomOwner() {

    try {

        const ownerSnapshot =
            await getDoc(

                doc(
                    db,
                    "users",
                    roomInfo.ownerUid
                )

            );


        if (
            ownerSnapshot.exists()
        ) {

            const owner =
                ownerSnapshot.data();


            if (
                $("room-host")
            ) {

                $("room-host")
                    .textContent =
                    owner.nickname ||
                    "房主";

            }


            if (
                $("host-avatar")
            ) {

                $("host-avatar").src =
                    owner.avatarUrl ||
                    avatarFallback(
                        owner.publicId
                    );

            }

        }

    }

    catch (error) {

        console.error(
            "读取房主资料失败：",
            error
        );

    }

}



// =========================================================
// APPLY ROOM BACKGROUND
// =========================================================

function applyRoomBackground(
    url
) {

    const root =
        $("room-root");


    if (!root) {

        return;

    }


    if (url) {

        root.style.backgroundImage =
            `
            linear-gradient(
                rgba(10,10,20,0.45),
                rgba(10,10,20,0.55)
            ),
            url("${url}")
            `;

    }

    else {

        root.style.backgroundImage =
            "";

    }

}



// =========================================================
// LIVEKIT EVENTS
// =========================================================

function bindLiveKitEvents() {

    // =====================================================
    // USER ENTER
    // =====================================================

    livekitRoom.on(

        LivekitClient
            .RoomEvent
            .ParticipantConnected,

        function(participant) {

            console.log(
                "用户进入：",
                participant.identity
            );


            updateOnline();


            renderSeats();

        }

    );



    // =====================================================
    // USER LEAVE
    // =====================================================

    livekitRoom.on(

        LivekitClient
            .RoomEvent
            .ParticipantDisconnected,

        function(participant) {

            console.log(
                "用户离开：",
                participant.identity
            );


            updateOnline();


            renderSeats();

        }

    );



    // =====================================================
    // ATTRIBUTES CHANGE
    // 麦位/头像/昵称
    // =====================================================

    livekitRoom.on(

        LivekitClient
            .RoomEvent
            .ParticipantAttributesChanged,

        function() {

            renderSeats();

        }

    );



    // =====================================================
    // ACTIVE SPEAKER
    // =====================================================

    livekitRoom.on(

        LivekitClient
            .RoomEvent
            .ActiveSpeakersChanged,

        function(speakers) {

            document
                .querySelectorAll(
                    ".voice-seat"
                )
                .forEach(
                    function(seat) {

                        seat.classList.remove(
                            "speaking"
                        );

                    }
                );


            speakers.forEach(
                function(participant) {

                    const seatNumber =
                        Number(
                            participant
                                .attributes
                                ?.voice_seat ||
                            0
                        );


                    if (
                        seatNumber <
                            1 ||
                        seatNumber >
                            8
                    ) {

                        return;

                    }


                    const seat =
                        document.querySelector(
                            `[data-seat="${seatNumber}"]`
                        );


                    if (seat) {

                        seat.classList.add(
                            "speaking"
                        );

                    }

                }
            );

        }

    );



    // =====================================================
    // RECEIVE AUDIO
    // =====================================================

    livekitRoom.on(

        LivekitClient
            .RoomEvent
            .TrackSubscribed,

        function(
            track,
            publication,
            participant
        ) {

            if (
                track.kind !==
                LivekitClient
                    .Track
                    .Kind
                    .Audio
            ) {

                return;

            }


            const audioElement =
                track.attach();


            audioElement.autoplay =
                true;


            audioElement.volume =
                speakerVolume;


            audioElement.style.display =
                "none";


            document.body.appendChild(
                audioElement
            );


            remoteAudioElements.set(

                publication.trackSid,

                {

                    track,

                    element:
                        audioElement,

                    participant

                }

            );


            console.log(
                "🔊 收到声音：",
                participant.identity
            );

        }

    );



    // =====================================================
    // REMOVE AUDIO
    // =====================================================

    livekitRoom.on(

        LivekitClient
            .RoomEvent
            .TrackUnsubscribed,

        function(
            track,
            publication
        ) {

            const item =
                remoteAudioElements.get(
                    publication.trackSid
                );


            if (item) {

                item.element.remove();


                remoteAudioElements.delete(
                    publication.trackSid
                );

            }


            try {

                track
                    .detach()
                    .forEach(
                        function(element) {

                            element.remove();

                        }
                    );

            }

            catch (error) {

            }

        }

    );



    // =====================================================
    // DATA RECEIVE
    // =====================================================

    livekitRoom.on(

        LivekitClient
            .RoomEvent
            .DataReceived,

        function(
            payload,
            participant,
            kind,
            topic
        ) {

            // =========================
            // CHAT
            // =========================

            if (
                topic ===
                CHAT_TOPIC
            ) {

                try {

                    const text =
                        new TextDecoder()
                            .decode(
                                payload
                            );


                    const data =
                        JSON.parse(
                            text
                        );


                    addChatMessage(
                        data,
                        false
                    );

                }

                catch (error) {

                    console.error(
                        "聊天消息解析失败：",
                        error
                    );

                }

            }


            // =========================
            // GIFT
            // =========================

            if (
                topic ===
                GIFT_TOPIC
            ) {

                try {

                    const text =
                        new TextDecoder()
                            .decode(
                                payload
                            );


                    const data =
                        JSON.parse(
                            text
                        );


                    showGiftAnimation(
                        data
                    );

                }

                catch (error) {

                    console.error(
                        "礼物消息解析失败：",
                        error
                    );

                }

            }

        }

    );

}



// =========================================================
// ONLINE COUNT
// =========================================================

function updateOnline() {

    if (
        !livekitRoom ||
        !$("room-online")
    ) {

        return;

    }


    const total =
        livekitRoom
            .remoteParticipants
            .size +
        1;


    $("room-online")
        .textContent =
        `👥 ${total} 人在线`;

}



// =========================================================
// ALL PARTICIPANTS
// =========================================================

function getParticipants() {

    if (!livekitRoom) {

        return [];

    }


    return [

        livekitRoom
            .localParticipant,

        ...
        livekitRoom
            .remoteParticipants
            .values()

    ];

}



// =========================================================
// RENDER SEATS
// =========================================================

function renderSeats() {

    // =====================================================
    // RESET ALL
    // =====================================================

    for (
        let seatNumber = 1;
        seatNumber <= 8;
        seatNumber++
    ) {

        clearSeat(
            seatNumber
        );

    }


    if (!livekitRoom) {

        return;

    }


    mySeat =
        null;



    // =====================================================
    // RENDER PARTICIPANTS
    // =====================================================

    getParticipants()
        .forEach(
            function(participant) {

                const seatNumber =
                    Number(
                        participant
                            .attributes
                            ?.voice_seat ||
                        0
                    );


                if (
                    seatNumber <
                        1 ||
                    seatNumber >
                        8
                ) {

                    return;

                }


                const seat =
                    document.querySelector(
                        `[data-seat="${seatNumber}"]`
                    );


                if (!seat) {

                    return;

                }


                const avatar =
                    seat.querySelector(
                        ".seat-avatar"
                    );


                const name =
                    $(
                        `seat-name-${seatNumber}`
                    );


                seat.classList.remove(
                    "empty-seat"
                );


                seat.classList.add(
                    "occupied-seat"
                );


                const isLocal =
                    participant ===
                    livekitRoom
                        .localParticipant;


                if (isLocal) {

                    seat.classList.add(
                        "my-seat"
                    );


                    mySeat =
                        seatNumber;

                }



                // =========================
                // AVATAR
                // =========================

                if (avatar) {

                    avatar.textContent =
                        "";


                    avatar.style.backgroundImage =
                        `url("${participantAvatar(participant)}")`;


                    avatar.style.backgroundSize =
                        "cover";


                    avatar.style.backgroundPosition =
                        "center";


                    // 只有圈圈能点击
                    avatar.onclick =
                        function() {

                            if (isLocal) {

                                toggleSeat(
                                    seatNumber
                                );

                            }

                            else {

                                selectedGiftReceiver =
                                    participant;


                                openGiftPanel();

                            }

                        };

                }



                // =========================
                // NAME
                // =========================

                if (name) {

                    name.textContent =
                        participantName(
                            participant
                        );

                }

            }
        );

}



// =========================================================
// CLEAR ONE SEAT
// =========================================================

function clearSeat(
    seatNumber
) {

    const seat =
        document.querySelector(
            `[data-seat="${seatNumber}"]`
        );


    if (!seat) {

        return;

    }


    const avatar =
        seat.querySelector(
            ".seat-avatar"
        );


    const name =
        $(
            `seat-name-${seatNumber}`
        );


    seat.classList.remove(
        "occupied-seat",
        "my-seat",
        "speaking"
    );


    seat.classList.add(
        "empty-seat"
    );


    if (avatar) {

        avatar.style.backgroundImage =
            "";


        avatar.textContent =
            "+";


        avatar.onclick =
            function() {

                toggleSeat(
                    seatNumber
                );

            };

    }


    if (name) {

        if (
            seatNumber ===
            8
        ) {

            name.textContent =
                "老板位";

        }

        else {

            name.textContent =
                `${seatNumber}号麦`;

        }

    }

}



// =========================================================
// CHECK OCCUPIED
// =========================================================

function isSeatOccupied(
    seatNumber
) {

    return getParticipants()
        .some(
            function(participant) {

                return (
                    Number(
                        participant
                            .attributes
                            ?.voice_seat ||
                        0
                    ) ===
                    seatNumber
                );

            }
        );

}



// =========================================================
// TOGGLE SEAT
// =========================================================

async function toggleSeat(
    seatNumber
) {

    if (
        !isConnected()
    ) {

        alert(
            "语音房正在连接，请稍后再试。"
        );


        return;

    }


    if (
        seatNumber <
            1 ||
        seatNumber >
            8
    ) {

        return;

    }


    try {

        // =================================================
        // CLICK CURRENT = LEAVE SEAT
        // =================================================

        if (
            mySeat ===
            seatNumber
        ) {

            if (
                microphoneEnabled
            ) {

                await stopMicrophone();

            }


            await livekitRoom
                .localParticipant
                .setAttributes({

                    voice_seat:
                        "",

                    avatar_url:
                        me.avatarUrl ||
                        "",

                    nickname:
                        me.nickname ||
                        ""

                });


            mySeat =
                null;


            renderSeats();


            return;

        }



        // =================================================
        // TARGET OCCUPIED
        // =================================================

        if (
            isSeatOccupied(
                seatNumber
            )
        ) {

            if (
                seatNumber ===
                8
            ) {

                alert(
                    "老板位已经有人了。"
                );

            }

            else {

                alert(
                    `${seatNumber}号麦已经有人了。`
                );

            }


            return;

        }



        // =================================================
        // ALLOW AUDIO PLAYBACK
        // =================================================

        try {

            await livekitRoom
                .startAudio();

        }

        catch (error) {

        }



        // =================================================
        // JOIN / MOVE
        // =================================================

        await livekitRoom
            .localParticipant
            .setAttributes({

                voice_seat:
                    String(
                        seatNumber
                    ),

                avatar_url:
                    me.avatarUrl ||
                    "",

                nickname:
                    me.nickname ||
                    ""

            });


        mySeat =
            seatNumber;


        renderSeats();

    }

    catch (error) {

        console.error(
            "上下麦失败：",
            error
        );


        alert(
            "上下麦失败，请稍后再试。"
        );

    }

}



// =========================================================
// MICROPHONE START
// 高音质 / 声卡模式
// =========================================================

async function startMicrophone() {

    if (!mySeat) {

        alert(
            "请先选择一个麦位上麦。"
        );


        return;

    }


    if (
        publishedMicTrack
    ) {

        return;

    }



    // =====================================================
    // RAW DEVICE STREAM
    // =====================================================

    rawMicStream =
        await navigator
            .mediaDevices
            .getUserMedia({

                audio: {

                    echoCancellation:
                        false,

                    noiseSuppression:
                        false,

                    autoGainControl:
                        false,

                    channelCount:
                        2,

                    sampleRate:
                        48000

                }

            });



    // =====================================================
    // WEB AUDIO GAIN
    // =====================================================

    micAudioContext =
        new AudioContext({

            sampleRate:
                48000

        });


    micSource =
        micAudioContext
            .createMediaStreamSource(
                rawMicStream
            );


    micGain =
        micAudioContext
            .createGain();


    micDestination =
        micAudioContext
            .createMediaStreamDestination();



    const initialVolume =
        Number(
            $("mic-volume")
                ?.value ||
            100
        );


    micGain.gain.value =
        initialVolume /
        100;



    micSource.connect(
        micGain
    );


    micGain.connect(
        micDestination
    );



    // =====================================================
    // CREATE LIVEKIT TRACK
    // =====================================================

    const processedTrack =
        micDestination
            .stream
            .getAudioTracks()[0];


    publishedMicTrack =
        new LivekitClient
            .LocalAudioTrack(
                processedTrack
            );



    // =====================================================
    // PUBLISH
    // =====================================================

    await livekitRoom
        .localParticipant
        .publishTrack(

            publishedMicTrack,

            {

                source:
                    LivekitClient
                        .Track
                        .Source
                        .Microphone,

                audioPreset:
                    LivekitClient
                        .AudioPresets
                        .musicHighQualityStereo

            }

        );


    microphoneEnabled =
        true;


    updateMicrophoneButton();


    console.log(
        "✅ 麦克风开启：48kHz / Stereo / Music HQ"
    );

}



// =========================================================
// MICROPHONE STOP
// =========================================================

async function stopMicrophone() {

    if (
        publishedMicTrack &&
        livekitRoom
    ) {

        try {

            await livekitRoom
                .localParticipant
                .unpublishTrack(
                    publishedMicTrack
                );

        }

        catch (error) {

        }


        try {

            publishedMicTrack.stop();

        }

        catch (error) {

        }


        publishedMicTrack =
            null;

    }



    if (
        rawMicStream
    ) {

        rawMicStream
            .getTracks()
            .forEach(
                function(track) {

                    track.stop();

                }
            );


        rawMicStream =
            null;

    }



    if (
        micAudioContext
    ) {

        try {

            await micAudioContext.close();

        }

        catch (error) {

        }

    }


    micAudioContext =
        null;


    micSource =
        null;


    micGain =
        null;


    micDestination =
        null;


    microphoneEnabled =
        false;


    updateMicrophoneButton();

}



// =========================================================
// TOGGLE MICROPHONE
// =========================================================

async function toggleMicrophone() {

    if (
        !isConnected()
    ) {

        alert(
            "语音服务器还在连接。"
        );


        return;

    }


    try {

        await livekitRoom
            .startAudio()
            .catch(
                function() {}
            );


        if (
            microphoneEnabled
        ) {

            await stopMicrophone();

        }

        else {

            await startMicrophone();

        }

    }

    catch (error) {

        console.error(
            "麦克风启动失败：",
            error
        );


        alert(
            "无法使用麦克风，请检查浏览器麦克风权限。"
        );

    }

}



// =========================================================
// UPDATE MICROPHONE BUTTON
// =========================================================

function updateMicrophoneButton() {

    const button =
        $("mic-button");


    const icon =
        $("mic-icon");


    const text =
        $("mic-text");


    if (
        !button ||
        !icon ||
        !text
    ) {

        return;

    }


    if (
        microphoneEnabled
    ) {

        button.classList.add(
            "mic-active"
        );


        icon.textContent =
            "🎙️";


        text.textContent =
            "麦克风开启";

    }

    else {

        button.classList.remove(
            "mic-active"
        );


        icon.textContent =
            "🔇";


        text.textContent =
            "麦克风";

    }

}



// =========================================================
// VOLUME CONTROLS
// =========================================================

function bindVolumeControls() {

    // =====================================================
    // SPEAKER
    // =====================================================

    const speakerSlider =
        $("speaker-volume");


    if (speakerSlider) {

        speakerSlider.oninput =
            function(event) {

                speakerVolume =
                    Number(
                        event.target.value
                    ) /
                    100;


                if (
                    $("speaker-volume-value")
                ) {

                    $("speaker-volume-value")
                        .textContent =
                        `${event.target.value}%`;

                }


                remoteAudioElements
                    .forEach(
                        function(item) {

                            item.element.volume =
                                speakerVolume;

                        }
                    );

            };

    }



    // =====================================================
    // MIC
    // =====================================================

    const micSlider =
        $("mic-volume");


    if (micSlider) {

        micSlider.oninput =
            function(event) {

                const value =
                    Number(
                        event.target.value
                    );


                if (
                    $("mic-volume-value")
                ) {

                    $("mic-volume-value")
                        .textContent =
                        `${value}%`;

                }


                if (
                    micGain
                ) {

                    micGain.gain.value =
                        value /
                        100;

                }

            };

    }



    // =====================================================
    // SPEAKER BUTTON = 0 / 100
    // =====================================================

    const speakerButton =
        $("speaker-button");


    if (speakerButton) {

        speakerButton.onclick =
            function() {

                if (!speakerSlider) {

                    return;

                }


                const current =
                    Number(
                        speakerSlider.value
                    );


                speakerSlider.value =
                    current >
                        0
                        ?
                        0
                        :
                        100;


                speakerSlider.dispatchEvent(
                    new Event(
                        "input"
                    )
                );

            };

    }

}



// =========================================================
// CHAT SEND
// =========================================================

async function sendChatMessage() {

    const input =
        $("chat-input");


    if (
        !input ||
        !isConnected()
    ) {

        return;

    }


    const message =
        input.value.trim();


    if (!message) {

        return;

    }


    const data = {

        type:
            "chat",

        message,

        sender:
            me.nickname ||
            "用户",

        senderUid:
            me.uid,

        time:
            Date.now()

    };


    try {

        const payload =
            new TextEncoder()
                .encode(
                    JSON.stringify(
                        data
                    )
                );


        await livekitRoom
            .localParticipant
            .publishData(
                payload,
                {

                    reliable:
                        true,

                    topic:
                        CHAT_TOPIC

                }
            );


        addChatMessage(
            data,
            true
        );


        input.value =
            "";


        input.focus();

    }

    catch (error) {

        console.error(
            "发送聊天失败：",
            error
        );

    }

}



// =========================================================
// ADD CHAT UI
// =========================================================

function addChatMessage(
    data,
    mine
) {

    const messages =
        $("chat-messages");


    if (!messages) {

        return;

    }


    const row =
        document.createElement(
            "div"
        );


    row.className =
        mine
            ?
            "chat-message my-message"
            :
            "chat-message";



    const name =
        document.createElement(
            "strong"
        );


    name.textContent =
        mine
            ?
            "我"
            :
            (
                data.sender ||
                "用户"
            );



    const text =
        document.createElement(
            "p"
        );


    // 防止 HTML / JS 注入

    text.textContent =
        data.message;



    row.appendChild(
        name
    );


    row.appendChild(
        text
    );


    messages.appendChild(
        row
    );


    messages.scrollTop =
        messages.scrollHeight;

}



// =========================================================
// BIND CHAT
// =========================================================

function bindChat() {

    const sendButton =
        $("chat-send-button");


    const input =
        $("chat-input");


    if (sendButton) {

        sendButton.onclick =
            sendChatMessage;

    }


    if (input) {

        input.onkeydown =
            function(event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();


                    sendChatMessage();

                }

            };

    }

}



// =========================================================
// GIFT GRID
// =========================================================

function renderGiftGrid() {

    const grid =
        $("gift-grid");


    if (!grid) {

        return;

    }


    grid.innerHTML =
        "";


    GIFTS.forEach(
        function(gift) {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "gift-item";


            const emoji =
                document.createElement(
                    "span"
                );


            emoji.className =
                "gift-emoji";


            emoji.textContent =
                gift.emoji;



            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                gift.name;



            const price =
                document.createElement(
                    "small"
                );


            price.textContent =
                `${gift.price} 金币`;



            button.append(
                emoji,
                name,
                price
            );


            button.onclick =
                function() {

                    sendGift(
                        gift
                    );

                };


            grid.appendChild(
                button
            );

        }
    );

}



// =========================================================
// OPEN GIFT
// =========================================================

function openGiftPanel() {

    if (
        !selectedGiftReceiver
    ) {

        alert(
            "请先点击一个已经上麦的用户头像。"
        );


        return;

    }


    $("gift-modal")
        ?.classList
        .remove(
            "hidden"
        );

}



// =========================================================
// CLOSE GIFT
// =========================================================

function closeGiftPanel() {

    $("gift-modal")
        ?.classList
        .add(
            "hidden"
        );

}



// =========================================================
// SEND GIFT
// =========================================================

async function sendGift(
    gift
) {

    if (
        !selectedGiftReceiver
    ) {

        return;

    }


    try {

        const response =
            await authFetch(
                "/api/gifts/send",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            giftId:
                                gift.id,

                            receiverUid:
                                selectedGiftReceiver
                                    .identity,

                            roomId

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            if (
                data.error ===
                "INSUFFICIENT_COINS"
            ) {

                alert(
                    "金币不足。"
                );


                return;

            }


            throw new Error(
                data.error ||
                "送礼失败"
            );

        }



        const packet = {

            giftId:
                gift.id,

            emoji:
                gift.emoji,

            name:
                gift.name,

            price:
                gift.price,

            animated:
                Boolean(
                    gift.animated
                ),

            sender:
                me.nickname,

            receiver:
                participantName(
                    selectedGiftReceiver
                )

        };



        // =================================================
        // BROADCAST
        // =================================================

        await livekitRoom
            .localParticipant
            .publishData(

                new TextEncoder()
                    .encode(
                        JSON.stringify(
                            packet
                        )
                    ),

                {

                    reliable:
                        true,

                    topic:
                        GIFT_TOPIC

                }

            );



        showGiftAnimation(
            packet
        );


        closeGiftPanel();

    }

    catch (error) {

        console.error(
            "送礼失败：",
            error
        );


        alert(
            "送礼失败：" +
            error.message
        );

    }

}



// =========================================================
// GIFT ANIMATION
// =========================================================

function showGiftAnimation(
    packet
) {

    const layer =
        $("gift-animation-layer");


    if (!layer) {

        return;

    }


    const node =
        document.createElement(
            "div"
        );


    node.className =
        packet.animated
            ?
            "big-gift-animation"
            :
            "small-gift-toast";



    const emoji =
        document.createElement(
            "div"
        );


    emoji.textContent =
        packet.emoji;



    const text =
        document.createElement(
            "strong"
        );


    text.textContent =
        `${packet.sender} 送给 ${packet.receiver} ${packet.name}`;



    node.append(
        emoji,
        text
    );


    layer.appendChild(
        node
    );


    setTimeout(
        function() {

            node.remove();

        },

        packet.animated
            ?
            3500
            :
            1800

    );

}



// =========================================================
// ROOM OWNER / ADMIN TOOLS
// =========================================================

function renderManageTools() {

    if (
        !roomInfo ||
        !me
    ) {

        return;

    }


    const uid =
        me.uid;


    const isOwner =
        uid ===
        roomInfo.ownerUid;


    const isAdmin =
        (
            roomInfo.admins ||
            []
        )
        .includes(
            uid
        );


    const canManage =
        isOwner ||
        isAdmin;


    if (!canManage) {

        return;

    }


    const stage =
        document.querySelector(
            ".voice-stage"
        );


    if (!stage) {

        return;

    }



    const box =
        document.createElement(
            "div"
        );


    box.className =
        "room-admin-tools";


    // =====================================================
    // BACKGROUND BUTTON
    // =====================================================

    const backgroundButton =
        document.createElement(
            "button"
        );


    backgroundButton.textContent =
        "更换房间背景";


    const backgroundFile =
        document.createElement(
            "input"
        );


    backgroundFile.type =
        "file";


    backgroundFile.accept =
        "image/*";


    backgroundFile.hidden =
        true;



    backgroundButton.onclick =
        function() {

            backgroundFile.click();

        };



    backgroundFile.onchange =
        async function(event) {

            const file =
                event
                    .target
                    .files[0];


            if (!file) {

                return;

            }


            try {

                const url =
                    await uploadRoomBackground(
                        roomId,
                        file
                    );


                const response =
                    await authFetch(
                        "/api/rooms/manage",
                        {

                            method:
                                "POST",

                            body:
                                JSON.stringify({

                                    action:
                                        "updateRoom",

                                    roomId,

                                    backgroundUrl:
                                        url

                                })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "更新背景失败"
                    );

                }


                roomInfo.backgroundUrl =
                    url;


                applyRoomBackground(
                    url
                );


                alert(
                    "房间背景已更新。"
                );

            }

            catch (error) {

                console.error(
                    "背景更新失败：",
                    error
                );


                alert(
                    "背景更新失败：" +
                    error.message
                );

            }

        };



    box.append(
        backgroundButton,
        backgroundFile
    );



    // =====================================================
    // OWNER ONLY ADMIN MANAGEMENT
    // =====================================================

    if (isOwner) {

        const adminInput =
            document.createElement(
                "input"
            );


        adminInput.id =
            "admin-public-id";


        adminInput.placeholder =
            "管理员8位ID";


        adminInput.maxLength =
            8;



        const addButton =
            document.createElement(
                "button"
            );


        addButton.textContent =
            "设为管理员";



        const removeButton =
            document.createElement(
                "button"
            );


        removeButton.textContent =
            "移除管理员";



        async function changeAdmin(
            action
        ) {

            const publicId =
                adminInput
                    .value
                    .trim();


            if (!publicId) {

                alert(
                    "请输入用户ID。"
                );


                return;

            }


            try {

                const response =
                    await authFetch(
                        "/api/rooms/manage",
                        {

                            method:
                                "POST",

                            body:
                                JSON.stringify({

                                    roomId,

                                    publicId,

                                    action

                                })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "操作失败"
                    );

                }


                alert(
                    "管理员设置已更新。"
                );

            }

            catch (error) {

                console.error(
                    "管理员操作失败：",
                    error
                );


                alert(
                    "操作失败：" +
                    error.message
                );

            }

        }



        addButton.onclick =
            function() {

                changeAdmin(
                    "addAdmin"
                );

            };


        removeButton.onclick =
            function() {

                changeAdmin(
                    "removeAdmin"
                );

            };



        box.append(
            adminInput,
            addButton,
            removeButton
        );

    }


    stage.appendChild(
        box
    );

}



// =========================================================
// BUTTON BINDING
// =========================================================

function bindUI() {

    bindVolumeControls();


    bindChat();


    renderGiftGrid();



    if (
        $("gift-button")
    ) {

        $("gift-button").onclick =
            function() {

                openGiftPanel();

            };

    }


    if (
        $("gift-close")
    ) {

        $("gift-close").onclick =
            function() {

                closeGiftPanel();

            };

    }

}



// =========================================================
// GO BACK
// =========================================================

async function goBack() {

    try {

        if (
            microphoneEnabled
        ) {

            await stopMicrophone();

        }

    }

    catch (error) {

    }


    try {

        if (
            livekitRoom
        ) {

            livekitRoom.disconnect();

        }

    }

    catch (error) {

    }


    window.location.href =
        "index.html";

}



// =========================================================
// PAGE CLOSE
// =========================================================

window.addEventListener(

    "beforeunload",

    function() {

        try {

            if (
                livekitRoom
            ) {

                livekitRoom.disconnect();

            }

        }

        catch (error) {

        }

    }

);



// =========================================================
// GLOBAL FUNCTIONS FOR HTML
// =========================================================

window.toggleSeat =
    toggleSeat;


window.toggleMicrophone =
    toggleMicrophone;


window.goBack =
    goBack;



// =========================================================
// START
// =========================================================

document.addEventListener(

    "DOMContentLoaded",

    async function() {

        try {

            bindUI();


            await joinRoom();

        }

        catch (error) {

            console.error(
                "进入房间失败：",
                error
            );


            alert(
                error.message ||
                "进入房间失败"
            );


            window.location.href =
                "index.html";

        }

    }

);


console.log(
    "✅ YZ Voice room.js 已加载"
);