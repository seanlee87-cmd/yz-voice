// =========================================================
// YZ VOICE
// HOMEPAGE SCRIPT.JS
// =========================================================


// =========================================================
// HELPERS
// =========================================================

function $(id) {

    return document.getElementById(id);

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}



// =========================================================
// SCROLL TO ROOM LIST
// =========================================================

function scrollToRooms() {

    const roomsSection =
        $("rooms");


    if (!roomsSection) {

        return;

    }


    roomsSection.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });

}



// =========================================================
// ROOM CATEGORY ICON
// =========================================================

function getCategoryIcon(
    category
) {

    switch (category) {

        case "sing":
            return "🎵";

        case "chat":
            return "💬";

        case "game":
            return "🎮";

        case "social":
            return "❤️";

        default:
            return "🎙️";

    }

}



// =========================================================
// ROOM CATEGORY TEXT
// =========================================================

function getCategoryText(
    category
) {

    if (
        typeof window.t ===
        "function"
    ) {

        switch (category) {

            case "sing":
                return window.t(
                    "singing"
                );

            case "chat":
                return window.t(
                    "chat"
                );

            case "game":
                return window.t(
                    "game"
                );

            case "social":
                return window.t(
                    "social"
                );

        }

    }


    switch (category) {

        case "sing":
            return "K歌";

        case "chat":
            return "聊天";

        case "game":
            return "游戏";

        case "social":
            return "交友";

        default:
            return "语音";

    }

}



// =========================================================
// REAL ROOM DATA
// =========================================================

let realRooms = [];

let currentRoomCategory = "all";


// =========================================================
// LOAD ROOMS FROM SERVER
// =========================================================

async function loadRooms() {

    try {

        const response =
            await fetch(
                "/api/rooms/list",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "ROOM_LIST_FAILED"
            );

        }


        realRooms =
            Array.isArray(data.rooms)
                ? data.rooms
                : [];


        console.log(
            "✅ 真实房间列表：",
            realRooms
        );


        generateRooms(
            currentRoomCategory
        );

    }

    catch (error) {

        console.error(
            "❌ 读取房间列表失败：",
            error
        );


        realRooms = [];


        generateRooms(
            currentRoomCategory
        );

    }

}


// =========================================================
// GET ROOM LIST
// =========================================================

function getRoomList() {

    return realRooms;

}



// =========================================================
// GENERATE ROOM CARDS
// =========================================================

function generateRooms(
    category = "all"
) {

    const grid =
        $("room-grid");


    if (!grid) {

        return;

    }


    const rooms =
        getRoomList();


    const filteredRooms =
        category === "all"
            ? rooms
            : rooms.filter(
                room =>
                    room.category ===
                    category
            );


    grid.innerHTML =
        "";


    if (
        filteredRooms.length ===
        0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "room-empty";


        empty.textContent =
            "暂无房间";


        grid.appendChild(
            empty
        );


        return;

    }


    filteredRooms.forEach(
        function(room) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "room-card";


            if (room.color) {

                card.classList.add(
                    "room-" +
                    room.color
                );

            }


            const titleKey =
                "room" +
                room.id;


            let title =
                room.title;


            if (
                typeof window.t ===
                "function"
            ) {

                const translated =
                    window.t(
                        titleKey
                    );


                if (
                    translated !==
                    titleKey
                ) {

                    title =
                        translated;

                }

            }


            const hostText =
                typeof window.t ===
                "function"
                    ? window.t(
                        "host"
                    )
                    : "房主";


            const enterText =
                typeof window.t ===
                "function"
                    ? window.t(
                        "enterRoom"
                    )
                    : "进入房间";


            card.innerHTML = `

                <div class="room-card-top">

                    <div class="room-icon">
                        ${
                            escapeHtml(
                                room.icon ||
                                getCategoryIcon(
                                    room.category
                                )
                            )
                        }
                    </div>

                    <div class="room-category">
                        ${
                            escapeHtml(
                                getCategoryText(
                                    room.category
                                )
                            )
                        }
                    </div>

                </div>


                <h3 class="room-title">
                    ${
                        escapeHtml(
                            title
                        )
                    }
                </h3>


                <div class="room-host">

                    <span>
                        ${escapeHtml(hostText)}
                    </span>

                    <strong>
                        ${
                            escapeHtml(
                                room.host ||
                                "-"
                            )
                        }
                    </strong>

                </div>


                <div class="room-card-bottom">

                    <div class="room-online">

                        👥
                        ${
                            Number(
                                room.online ||
                                0
                            )
                        }
                        /
                        ${
                            Number(
                                room.maxUsers ||
                                0
                            )
                        }

                    </div>


                    <button
                        type="button"
                        class="enter-room-btn"
                    >
                        ${escapeHtml(enterText)}
                    </button>

                </div>

            `;


            const enterButton =
                card.querySelector(
                    ".enter-room-btn"
                );


            if (enterButton) {

                enterButton.addEventListener(
                    "click",
                    function(event) {

                        event.stopPropagation();

                        enterRoom(
                            room
                        );

                    }
                );

            }


            card.addEventListener(
                "click",
                function() {

                    enterRoom(
                        room
                    );

                }
            );


            grid.appendChild(
                card
            );

        }
    );

}



// =========================================================
// FILTER ROOMS
// =========================================================

function filterRooms(
    category,
    button
) {

    currentRoomCategory =
        category || "all";

    document
        .querySelectorAll(
            ".room-filter .filter-btn"
        )
        .forEach(
            function(item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }


    generateRooms(
        category
    );

}



// =========================================================
// ENTER ROOM
// =========================================================

function enterRoom(
    room
) {

    if (!room) {

        return;

    }


    const roomId =
        room.roomId ||
        room.id;


    window.location.href =
        "room.html?id=" +
        encodeURIComponent(
            roomId
        );

}



// =========================================================
// CREATE ROOM
// =========================================================

function goCreateRoom() {

    window.location.href =
        "create-room.html";

}



// =========================================================
// AUTH NAVIGATION
// =========================================================

async function updateHomepageUser() {

    const guestNav =
        $("guest-nav");


    const userNav =
        $("user-nav");


    const nicknameElement =
        $("nav-user-nickname");


    const avatarElement =
        $("nav-user-avatar");


    try {

        const authModule =
            await import(
                "./auth-client.js"
            );


        // =========================================
        // CHECK LOGIN
        // =========================================

        const user =
            await authModule.getCurrentUser();


        if (!user) {

            showGuestNav();

            return;

        }


        // =========================================
        // 已登录：隐藏登录/注册
        // =========================================

        if (guestNav) {

            guestNav.classList.add(
                "hidden"
            );

            guestNav.style.display =
                "none";

        }


        if (userNav) {

            userNav.classList.remove(
                "hidden"
            );

            userNav.style.display =
                "flex";

        }


        // =========================================
        // READ YZ VOICE PROFILE
        // =========================================

        const response =
            await authModule.authFetch(
                "/api/profile"
            );


        if (!response.ok) {

            console.warn(
                "首页读取用户资料失败：",
                response.status
            );

            return;

        }


        const data =
            await response.json();


        // 你的 API 正常结构：
        // {
        //     profile: {...},
        //     wallet: {...}
        // }

        const profile =
            data.profile ||
            data;


        console.log(
            "✅ 首页用户资料：",
            profile
        );


        // =========================================
        // NICKNAME
        // 一定优先用 YZ VOICE 昵称
        // =========================================

        if (nicknameElement) {

            nicknameElement.textContent =
                profile.nickname ||
                "用户";

        }


        // =========================================
        // AVATAR
        // 一定优先用 YZ VOICE 个人头像
        // =========================================

        if (avatarElement) {

            let avatarUrl =
                profile.avatarUrl ||
                "";


            // 个人资料没头像才用 Google
            if (!avatarUrl) {

                avatarUrl =
                    user.photoURL ||
                    "";

            }


            // 都没有就用默认头像
            if (!avatarUrl) {

                const seed =
                    profile.publicId ||
                    profile.nickname ||
                    user.uid;


                avatarUrl =
                    `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

            }


            avatarElement.src =
                avatarUrl;


            avatarElement.onerror =
                function () {

                    const seed =
                        profile.publicId ||
                        profile.nickname ||
                        user.uid;


                    avatarElement.src =
                        `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

                };

        }

    }

    catch (error) {

        console.error(
            "首页用户资料读取失败：",
            error
        );


        showGuestNav();

    }

}



// =========================================================
// SHOW GUEST NAV
// =========================================================

function showGuestNav() {

    const guestNav =
        $("guest-nav");


    const userNav =
        $("user-nav");


    if (guestNav) {

        guestNav.classList.remove(
            "hidden"
        );

        guestNav.style.display =
            "flex";

    }


    if (userNav) {

        userNav.classList.add(
            "hidden"
        );

        userNav.style.display =
            "none";

    }

}



// =========================================================
// BIND CREATE ROOM BUTTONS
// =========================================================

function bindCreateRoomButtons() {

    document
        .querySelectorAll(
            ".secondary-btn, .floating-create"
        )
        .forEach(
            function(button) {

                // 如果 HTML 本身已经有 onclick，
                // 就不重复绑定

                if (
                    button.getAttribute(
                        "onclick"
                    )
                ) {

                    return;

                }


                button.addEventListener(
                    "click",
                    goCreateRoom
                );

            }
        );

}



// =========================================================
// BIND FILTER BUTTON DATA
// =========================================================

function prepareFilterButtons() {

    const buttons =
        document.querySelectorAll(
            ".room-filter .filter-btn"
        );


    buttons.forEach(
        function(button) {

            const onclickText =
                button.getAttribute(
                    "onclick"
                ) || "";


            if (
                onclickText.includes(
                    "'sing'"
                )
            ) {

                button.dataset.category =
                    "sing";

            }

            else if (
                onclickText.includes(
                    "'chat'"
                )
            ) {

                button.dataset.category =
                    "chat";

            }

            else if (
                onclickText.includes(
                    "'game'"
                )
            ) {

                button.dataset.category =
                    "game";

            }

            else if (
                onclickText.includes(
                    "'social'"
                )
            ) {

                button.dataset.category =
                    "social";

            }

            else {

                button.dataset.category =
                    "all";

            }

        }
    );

}



// =========================================================
// PAGE START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "✅ YZ Voice 首页 script.js 已加载"
        );


        prepareFilterButtons();


        loadRooms();


        bindCreateRoomButtons();


        updateHomepageUser();

    }
);



// =========================================================
// EXPOSE FUNCTIONS
// 给 HTML onclick / lang.js 使用
// =========================================================

window.scrollToRooms =
    scrollToRooms;


window.filterRooms =
    filterRooms;


window.generateRooms =
    generateRooms;


window.enterRoom =
    enterRoom;


window.goCreateRoom =
    goCreateRoom;


window.updateHomepageUser =
    updateHomepageUser;

window.loadRooms =
    loadRooms;