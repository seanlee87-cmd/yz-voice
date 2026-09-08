// =========================
// GENERATE ROOMS
// =========================

function generateRooms(category = "all") {

    const roomGrid =
        document.getElementById(
            "room-grid"
        );


    if (!roomGrid) {

        return;

    }


    roomGrid.innerHTML =
        "";


    const filteredRooms =
        appData.rooms.filter(
            function(room) {

                if (
                    category === "all"
                ) {

                    return true;

                }


                return (
                    room.category ===
                    category
                );

            }
        );


    filteredRooms.forEach(
        function(room) {

            const roomCard =
                document.createElement(
                    "div"
                );


            roomCard.className =
                "room-card " +
                room.color;


            // =========================
            // 房间名称翻译
            // =========================

            let roomTitle =
                room.title;


            if (
                typeof t ===
                "function"
            ) {

                const roomKey =
                    "room" +
                    room.id;


                const translated =
                    t(roomKey);


                if (
                    translated !==
                    roomKey
                ) {

                    roomTitle =
                        translated;

                }

            }


            const hostText =
                typeof t === "function"
                    ? t("host")
                    : "房主";


            const enterText =
                typeof t === "function"
                    ? t("enterRoom")
                    : "进入房间";


            roomCard.innerHTML =

                '<div class="room-top">' +

                    '<div class="room-icon">' +
                        room.icon +
                    '</div>' +

                    '<span class="live-label">' +
                        'LIVE' +
                    '</span>' +

                '</div>' +


                '<div class="room-info">' +

                    '<h3>' +
                        roomTitle +
                    '</h3>' +

                    '<p>' +
                        '🎙️ ' +
                        hostText +
                        '：' +
                        room.host +
                    '</p>' +

                    '<div class="room-bottom">' +

                        '<span>' +

                            '👥 ' +
                            room.online +
                            '/' +
                            room.maxUsers +

                        '</span>' +

                        '<button onclick="enterRoom(' +
                            room.id +
                        ')">' +

                            enterText +

                        '</button>' +

                    '</div>' +

                '</div>';


            roomGrid.appendChild(
                roomCard
            );

        }
    );

}


// =========================
// FILTER ROOMS
// =========================

function filterRooms(category, button) {

    const filterButtons =
        document.querySelectorAll(
            ".filter-btn"
        );


    filterButtons.forEach(
        function(btn) {

            btn.classList.remove(
                "active"
            );

        }
    );


    button.classList.add(
        "active"
    );


    generateRooms(category);

}


// =========================
// ENTER ROOM
// =========================

function enterRoom(roomId) {

    window.location.href =
        "room.html?id=" +
        roomId;

}


// =========================
// SCROLL TO ROOMS
// =========================

function scrollToRooms() {

    document
        .getElementById("rooms")
        .scrollIntoView({

            behavior: "smooth"

        });

}


// =========================
// LOAD APP
// =========================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        generateRooms();

    }
);