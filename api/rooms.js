const bcrypt = require("bcryptjs");

const {
    AccessToken
} = require("livekit-server-sdk");

const {
    getAdmin
} = require("./_lib/firebaseAdmin");

const {
    json,
    requireAuth,
    body,
    getBody
} = require("./_lib/http");


const ROOM_CATEGORIES = [
    "sing",
    "chat",
    "game",
    "social"
];


// =========================================================
// READ BODY
// 同时兼容你项目目前的 body / getBody
// =========================================================

function readBody(req) {

    if (
        typeof getBody === "function"
    ) {
        return getBody(req);
    }

    if (
        typeof body === "function"
    ) {
        return body(req);
    }

    return {};
}


// =========================================================
// MAIN HANDLER
// =========================================================

module.exports =
async function handler(req, res) {

    try {

        const routeAction =
            String(
                req.query?.action ||
                ""
            );


        // =====================================================
        // LIST ROOMS
        //
        // GET /api/rooms?action=list
        // =====================================================

        if (
            req.method === "GET" &&
            routeAction === "list"
        ) {

            return await listRooms(
                req,
                res
            );

        }


        if (
            req.method !== "POST"
        ) {

            return json(
                res,
                405,
                {
                    error:
                        "METHOD_NOT_ALLOWED"
                }
            );

        }


        // =====================================================
        // CREATE
        // =====================================================

        if (
            routeAction === "create"
        ) {

            return await createRoom(
                req,
                res
            );

        }


        // =====================================================
        // JOIN
        // =====================================================

        if (
            routeAction === "join"
        ) {

            return await joinRoom(
                req,
                res
            );

        }


        // =====================================================
        // MANAGE
        // =====================================================

        if (
            routeAction === "manage"
        ) {

            return await manageRoom(
                req,
                res
            );

        }


        return json(
            res,
            400,
            {
                error:
                    "INVALID_ROUTE_ACTION"
            }
        );

    }

    catch (error) {

        console.error(
            "ROOMS API ERROR:",
            error
        );


        return json(
            res,
            error.status ||
            400,
            {
                error:
                    error.message ||
                    "ROOMS_FAILED"
            }
        );

    }

};



// =========================================================
// CREATE ROOM
//
// POST /api/rooms?action=create
// =========================================================

async function createRoom(
    req,
    res
) {

    const user =
        await requireAuth(req);


    const requestBody =
        readBody(req);


    const title =
        String(
            requestBody.title ||
            ""
        ).trim();


    const category =
        String(
            requestBody.category ||
            ""
        );


    if (
        title.length < 2 ||
        title.length > 30 ||
        !ROOM_CATEGORIES.includes(
            category
        )
    ) {

        return json(
            res,
            400,
            {
                error:
                    "INVALID_ROOM"
            }
        );

    }


    const password =
        String(
            requestBody.password ||
            ""
        );


    const passwordHash =
        password
            ? await bcrypt.hash(
                password,
                10
            )
            : "";


    const admin =
        getAdmin();


    const db =
        admin.firestore();


    const roomRef =
        db
            .collection("rooms")
            .doc();


    await roomRef.set({

        title,

        category,

        ownerUid:
            user.uid,

        admins:
            [],

        passwordHash,

        hasPassword:
            Boolean(password),

        backgroundUrl:
            "",

        createdAt:
            admin
                .firestore
                .FieldValue
                .serverTimestamp(),

        active:
            true

    });


    return json(
        res,
        200,
        {
            ok:
                true,

            roomId:
                roomRef.id
        }
    );

}



// =========================================================
// LIST ROOMS
//
// GET /api/rooms?action=list
// =========================================================

async function listRooms(
    req,
    res
) {

    const admin =
        getAdmin();


    const db =
        admin.firestore();


    const snapshot =
        await db
            .collection("rooms")
            .where(
                "active",
                "==",
                true
            )
            .get();


    const rooms =
        [];


    snapshot.forEach(
        function(doc) {

            const data =
                doc.data();


            let createdAt =
                0;


            if (
                data.createdAt &&
                typeof data.createdAt.toMillis ===
                    "function"
            ) {

                createdAt =
                    data.createdAt.toMillis();

            }


            rooms.push({

                roomId:
                    doc.id,

                id:
                    doc.id,

                title:
                    data.title ||
                    "语音房",

                category:
                    data.category ||
                    "chat",

                ownerUid:
                    data.ownerUid ||
                    "",

                host:
                    data.ownerNickname ||
                    data.host ||
                    "房主",

                hasPassword:
                    Boolean(
                        data.hasPassword
                    ),

                backgroundUrl:
                    data.backgroundUrl ||
                    "",

                online:
                    Number(
                        data.online ||
                        0
                    ),

                maxUsers:
                    Number(
                        data.maxUsers ||
                        8
                    ),

                createdAt

            });

        }
    );


    rooms.sort(
        function(a, b) {

            return (
                b.createdAt -
                a.createdAt
            );

        }
    );


    return json(
        res,
        200,
        {
            rooms
        }
    );

}



// =========================================================
// JOIN ROOM
//
// POST /api/rooms?action=join
// =========================================================

async function joinRoom(
    req,
    res
) {

    const user =
        await requireAuth(req);


    const requestBody =
        readBody(req);


    const roomId =
        String(
            requestBody.roomId ||
            ""
        );


    if (!roomId) {

        return json(
            res,
            400,
            {
                error:
                    "ROOM_ID_REQUIRED"
            }
        );

    }


    const admin =
        getAdmin();


    const db =
        admin.firestore();


    const roomSnap =
        await db
            .collection("rooms")
            .doc(roomId)
            .get();


    if (
        !roomSnap.exists
    ) {

        return json(
            res,
            404,
            {
                error:
                    "ROOM_NOT_FOUND"
            }
        );

    }


    const room =
        roomSnap.data();


    // =====================================================
    // PASSWORD
    // =====================================================

    if (
        room.passwordHash
    ) {

        const validPassword =
            await bcrypt.compare(
                String(
                    requestBody.password ||
                    ""
                ),
                room.passwordHash
            );


        if (
            !validPassword
        ) {

            return json(
                res,
                401,
                {
                    error:
                        "WRONG_ROOM_PASSWORD"
                }
            );

        }

    }


    // =====================================================
    // PROFILE
    // =====================================================

    const profileSnap =
        await db
            .collection("users")
            .doc(user.uid)
            .get();


    const profile =
        profileSnap.exists
            ? profileSnap.data()
            : {};


    // =====================================================
    // LIVEKIT TOKEN
    // =====================================================

    const token =
        new AccessToken(

            process.env
                .LIVEKIT_API_KEY,

            process.env
                .LIVEKIT_API_SECRET,

            {

                identity:
                    user.uid,

                name:
                    profile.nickname ||
                    user.name ||
                    profile.publicId ||
                    "User",

                ttl:
                    "2h"

            }

        );


    token.addGrant({

        roomJoin:
            true,

        room:
            `yz-room-${roomSnap.id}`,

        canPublish:
            true,

        canSubscribe:
            true,

        canPublishData:
            true,

        canUpdateOwnMetadata:
            true

    });


    return json(
        res,
        200,
        {

            token:
                await token.toJwt(),

            url:
                process.env
                    .LIVEKIT_URL,

            room: {

                id:
                    roomSnap.id,

                title:
                    room.title,

                ownerUid:
                    room.ownerUid,

                admins:
                    room.admins ||
                    [],

                backgroundUrl:
                    room.backgroundUrl ||
                    ""

            },

            me: {

                uid:
                    user.uid,

                publicId:
                    profile.publicId ||
                    "",

                nickname:
                    profile.nickname ||
                    "",

                avatarUrl:
                    profile.avatarUrl ||
                    ""

            }

        }
    );

}



// =========================================================
// MANAGE ROOM
//
// POST /api/rooms?action=manage
//
// body.action:
// updateRoom
// addAdmin
// removeAdmin
// =========================================================

async function manageRoom(
    req,
    res
) {

    const decoded =
        await requireAuth(req);


    const requestBody =
        readBody(req);


    const roomId =
        String(
            requestBody.roomId ||
            ""
        );


    if (!roomId) {

        return json(
            res,
            400,
            {
                error:
                    "ROOM_ID_REQUIRED"
            }
        );

    }


    const admin =
        getAdmin();


    const db =
        admin.firestore();


    const roomRef =
        db
            .collection("rooms")
            .doc(roomId);


    const roomSnap =
        await roomRef.get();


    if (
        !roomSnap.exists
    ) {

        return json(
            res,
            404,
            {
                error:
                    "ROOM_NOT_FOUND"
            }
        );

    }


    const room =
        roomSnap.data();


    const isOwner =
        room.ownerUid ===
        decoded.uid;


    const isAdmin =
        (
            room.admins ||
            []
        ).includes(
            decoded.uid
        );



    // =====================================================
    // UPDATE ROOM
    // =====================================================

    if (
        requestBody.action ===
        "updateRoom"
    ) {

        if (
            !isOwner &&
            !isAdmin
        ) {

            return json(
                res,
                403,
                {
                    error:
                        "FORBIDDEN"
                }
            );

        }


        const updates =
            {};


        if (
            requestBody.backgroundUrl !==
            undefined
        ) {

            updates.backgroundUrl =
                String(
                    requestBody.backgroundUrl ||
                    ""
                );

        }


        if (
            requestBody.title !==
            undefined
        ) {

            const title =
                String(
                    requestBody.title ||
                    ""
                )
                    .trim()
                    .slice(
                        0,
                        30
                    );


            if (
                title.length <
                2
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "INVALID_ROOM_TITLE"
                    }
                );

            }


            updates.title =
                title;

        }


        if (
            Object.keys(
                updates
            ).length >
            0
        ) {

            await roomRef.update(
                updates
            );

        }


        return json(
            res,
            200,
            {
                ok:
                    true
            }
        );

    }



    // =====================================================
    // ADD / REMOVE ADMIN
    // =====================================================

    if (
        requestBody.action ===
            "addAdmin" ||
        requestBody.action ===
            "removeAdmin"
    ) {

        if (
            !isOwner
        ) {

            return json(
                res,
                403,
                {
                    error:
                        "OWNER_ONLY"
                }
            );

        }


        const publicId =
            String(
                requestBody.publicId ||
                ""
            )
                .trim()
                .padStart(
                    8,
                    "0"
                );


        const publicIdSnap =
            await db
                .collection(
                    "public_ids"
                )
                .doc(
                    publicId
                )
                .get();


        if (
            !publicIdSnap.exists
        ) {

            return json(
                res,
                404,
                {
                    error:
                        "USER_NOT_FOUND"
                }
            );

        }


        const targetUid =
            publicIdSnap
                .data()
                .uid;


        if (
            targetUid ===
            room.ownerUid
        ) {

            return json(
                res,
                400,
                {
                    error:
                        "OWNER_ALREADY_HAS_PERMISSION"
                }
            );

        }


        const FV =
            admin
                .firestore
                .FieldValue;


        if (
            requestBody.action ===
            "addAdmin"
        ) {

            await roomRef.update({

                admins:
                    FV.arrayUnion(
                        targetUid
                    )

            });

        }

        else {

            await roomRef.update({

                admins:
                    FV.arrayRemove(
                        targetUid
                    )

            });

        }


        return json(
            res,
            200,
            {
                ok:
                    true
            }
        );

    }


    return json(
        res,
        400,
        {
            error:
                "INVALID_ACTION"
        }
    );

}