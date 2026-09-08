const {
    getAdmin
} = require("./_lib/firebaseAdmin");


const {
    json,
    requireAuth,
    normalizeNickname,
    validateNickname
} = require("./_lib/http");



// =========================================================
// READ REQUEST BODY
// =========================================================

function readBody(req) {

    if (!req.body) {
        return {};
    }


    // Vercel 已经解析成 object
    if (
        typeof req.body === "object"
    ) {
        return req.body;
    }


    // 如果还是 JSON 字符串
    if (
        typeof req.body === "string"
    ) {

        try {

            return JSON.parse(
                req.body
            );

        } catch {

            throw new Error(
                "INVALID_JSON"
            );

        }

    }


    return {};
}



// =========================================================
// PROFILE API
// =========================================================

module.exports =
async function handler(req, res) {

    try {

        // =================================================
        // LOGIN
        // =================================================

        const decoded =
            await requireAuth(req);


        const admin =
            getAdmin();


        const db =
            admin.firestore();


        const userRef =
            db
                .collection("users")
                .doc(decoded.uid);


        const privateRef =
            db
                .collection("user_private")
                .doc(decoded.uid);



        // =================================================
        // GET PROFILE
        // =================================================

        if (
            req.method === "GET"
        ) {

            const [
                publicSnap,
                privateSnap
            ] =
            await Promise.all([

                userRef.get(),

                privateRef.get()

            ]);


            if (
                !publicSnap.exists
            ) {

                return json(
                    res,
                    404,
                    {
                        error:
                            "PROFILE_NOT_FOUND"
                    }
                );

            }


            const profile =
                publicSnap.data();


            const privateData =
                privateSnap.exists
                    ? privateSnap.data()
                    : {};


            return json(
                res,
                200,
                {

                    profile,

                    wallet: {

                        coins:
                            Number(
                                privateData.coins ||
                                0
                            ),

                        diamonds:
                            Number(
                                privateData.diamonds ||
                                0
                            )

                    }

                }
            );

        }



        // =================================================
        // POST PROFILE UPDATE
        // =================================================

        if (
            req.method === "POST"
        ) {

            const body =
                readBody(req);


            console.log(
                "PROFILE UPDATE FIELDS:",
                Object.keys(body)
            );


            await db.runTransaction(
                async function(tx) {

                    const snap =
                        await tx.get(
                            userRef
                        );


                    if (
                        !snap.exists
                    ) {

                        const error =
                            new Error(
                                "PROFILE_NOT_FOUND"
                            );


                        error.status =
                            404;


                        throw error;

                    }


                    const oldProfile =
                        snap.data();


                    const updates =
                        {};



                    // =====================================
                    // NICKNAME
                    // =====================================

                    if (
                        body.nickname !==
                        undefined
                    ) {

                        const nickname =
                            String(
                                body.nickname
                            ).trim();


                        if (
                            !validateNickname(
                                nickname
                            )
                        ) {

                            throw new Error(
                                "INVALID_NICKNAME"
                            );

                        }


                        if (
                            nickname !==
                            oldProfile.nickname
                        ) {

                            const newKey =
                                encodeURIComponent(
                                    normalizeNickname(
                                        nickname
                                    )
                                );


                            const oldKey =
                                encodeURIComponent(
                                    normalizeNickname(
                                        oldProfile.nickname ||
                                        ""
                                    )
                                );


                            const newNicknameRef =
                                db
                                    .collection(
                                        "nicknames"
                                    )
                                    .doc(
                                        newKey
                                    );


                            const nicknameSnap =
                                await tx.get(
                                    newNicknameRef
                                );


                            if (
                                nicknameSnap.exists &&
                                nicknameSnap.data().uid !==
                                    decoded.uid
                            ) {

                                throw new Error(
                                    "NICKNAME_TAKEN"
                                );

                            }


                            tx.set(
                                newNicknameRef,
                                {
                                    uid:
                                        decoded.uid,

                                    nickname
                                }
                            );


                            if (
                                oldKey &&
                                newKey !== oldKey
                            ) {

                                tx.delete(

                                    db
                                        .collection(
                                            "nicknames"
                                        )
                                        .doc(
                                            oldKey
                                        )

                                );

                            }


                            updates.nickname =
                                nickname;

                        }

                    }



                    // =====================================
                    // AVATAR
                    // =====================================

                    if (
                        body.avatarUrl !==
                        undefined
                    ) {

                        const avatarUrl =
                            String(
                                body.avatarUrl ||
                                ""
                            );


                        // 允许清除头像
                        if (
                            avatarUrl === ""
                        ) {

                            updates.avatarUrl =
                                "";

                        }

                        else {

                            // 目前不使用 Firebase Storage，
                            // 所以允许压缩后的 Data URL

                            const validImage =
                                avatarUrl.startsWith(
                                    "data:image/webp;base64,"
                                ) ||
                                avatarUrl.startsWith(
                                    "data:image/jpeg;base64,"
                                ) ||
                                avatarUrl.startsWith(
                                    "data:image/png;base64,"
                                ) ||
                                avatarUrl.startsWith(
                                    "https://"
                                );


                            if (
                                !validImage
                            ) {

                                throw new Error(
                                    "INVALID_AVATAR"
                                );

                            }


                            // 防止 Firestore 文档被超大图片撑爆
                            if (
                                avatarUrl.length >
                                400000
                            ) {

                                throw new Error(
                                    "AVATAR_TOO_LARGE"
                                );

                            }


                            updates.avatarUrl =
                                avatarUrl;

                        }

                    }



                    // =====================================
                    // SAVE
                    // =====================================

                    if (
                        Object.keys(
                            updates
                        ).length >
                        0
                    ) {

                        tx.update(
                            userRef,
                            updates
                        );

                    }

                }
            );


            return json(
                res,
                200,
                {
                    ok: true
                }
            );

        }



        // =================================================
        // METHOD
        // =================================================

        return json(
            res,
            405,
            {
                error:
                    "METHOD_NOT_ALLOWED"
            }
        );

    }

    catch (error) {

        console.error(
            "PROFILE API ERROR:",
            error
        );


        return json(
            res,
            error.status ||
            400,
            {
                error:
                    error.message ||
                    "PROFILE_FAILED"
            }
        );

    }

};