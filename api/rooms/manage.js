const {
    getAdmin
} =
require("../_lib/firebaseAdmin");


const {
    json,
    requireAuth,
    getBody
} =
require("../_lib/http");


module.exports =
async function handler(req, res) {

    if (
        req.method !==
        "POST"
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


    try {

        const decoded =
            await requireAuth(req);


        const body =
            getBody(req);


        const roomId =
            String(
                body.roomId ||
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


        if (!roomSnap.exists) {

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
            )
            .includes(
                decoded.uid
            );



        // =============================================
        // UPDATE ROOM
        // 房主 / 管理员
        // =============================================

        if (
            body.action ===
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
                body.backgroundUrl !==
                undefined
            ) {

                updates.backgroundUrl =
                    String(
                        body.backgroundUrl ||
                        ""
                    );

            }


            if (
                body.title !==
                undefined
            ) {

                const title =
                    String(
                        body.title ||
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
                    ok: true
                }
            );

        }



        // =============================================
        // ADD / REMOVE ADMIN
        // 只有房主可以
        // =============================================

        if (
            body.action ===
            "addAdmin" ||
            body.action ===
            "removeAdmin"
        ) {

            if (!isOwner) {

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
                    body.publicId ||
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
                body.action ===
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
                    ok: true
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

    catch (error) {

        console.error(
            "ROOM MANAGE ERROR:",
            error
        );


        return json(
            res,
            error.status ||
            400,
            {

                error:
                    error.message ||
                    "ROOM_MANAGE_FAILED"

            }
        );

    }

};