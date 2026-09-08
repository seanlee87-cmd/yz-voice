const { getAdmin } = require("./_lib/firebaseAdmin");

const {
    json,
    requireAuth,
    getBody,
    normalizeNickname,
    validateNickname
} = require("./_lib/http");


module.exports =
async function handler(req, res) {

    try {

        // =============================================
        // 先确认用户登录
        // =============================================

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



        // =============================================
        // GET
        // 读取自己的个人资料
        // =============================================

        if (req.method === "GET") {

            const [
                publicSnap,
                privateSnap
            ] =
            await Promise.all([

                userRef.get(),

                privateRef.get()

            ]);


            if (!publicSnap.exists) {

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
                    ?
                    privateSnap.data()
                    :
                    {};


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



        // =============================================
        // POST
        // 修改昵称 / 头像
        // =============================================

        if (req.method === "POST") {

            const body =
                getBody(req);


            await db.runTransaction(
                async function(tx) {

                    const snap =
                        await tx.get(
                            userRef
                        );


                    if (!snap.exists) {

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



                    // =================================
                    // 修改昵称
                    // =================================

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
                                        oldProfile.nickname
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
                                newKey !==
                                oldKey
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



                    // =================================
                    // 修改头像
                    // =================================

                    if (
                        body.avatarUrl !==
                        undefined
                    ) {

                        updates.avatarUrl =
                            String(
                                body.avatarUrl ||
                                ""
                            );

                    }



                    // =================================
                    // 不允许修改这些
                    // =================================
                    //
                    // gender
                    // birthMonth
                    // birthDay
                    // birthYear
                    //
                    // 所以这里完全不处理
                    // =================================


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