const { getAdmin } = require("../_lib/firebaseAdmin");
const { json } = require("../_lib/http");

module.exports = async function (req, res) {

    if (req.method !== "GET") {
        return json(res, 405, {
            error: "METHOD_NOT_ALLOWED"
        });
    }

    try {

        const admin = getAdmin();
        const db = admin.firestore();

        const snapshot = await db
            .collection("rooms")
            .where("active", "==", true)
            .get();

        const rooms = [];

        snapshot.forEach(doc => {

            const data = doc.data();

            rooms.push({
                roomId: doc.id,
                id: doc.id,

                title: data.title || "语音房",
                category: data.category || "chat",

                ownerUid: data.ownerUid || "",

                host:
                    data.ownerNickname ||
                    data.host ||
                    "房主",

                hasPassword:
                    Boolean(data.hasPassword),

                backgroundUrl:
                    data.backgroundUrl || "",

                online:
                    Number(data.online || 0),

                maxUsers:
                    Number(data.maxUsers || 8),

                createdAt:
                    data.createdAt
                        ? data.createdAt.toMillis()
                        : 0
            });

        });

        rooms.sort(
            (a, b) =>
                b.createdAt - a.createdAt
        );

        return json(res, 200, {
            rooms
        });

    } catch (error) {

        console.error(
            "ROOM LIST ERROR:",
            error
        );

        return json(res, 500, {
            error:
                error.message ||
                "ROOM_LIST_FAILED"
        });
    }
};