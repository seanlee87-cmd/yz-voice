const {
    getAdmin
} = require("./_lib/firebaseAdmin");


const {
    json,
    requireAuth,
    body
} = require("./_lib/http");


module.exports =
async function handler(req, res) {

    if (req.method !== "POST") {

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

        const user =
            await requireAuth(req);


        const requestBody =
            body(req);


        const action =
            String(
                requestBody.action ||
                ""
            );


        const diamonds =
            Math.floor(
                Number(
                    requestBody.diamonds ||
                    0
                )
            );


        if (
            !Number.isFinite(diamonds) ||
            diamonds <= 0
        ) {

            return json(
                res,
                400,
                {
                    error:
                        "INVALID_AMOUNT"
                }
            );

        }


        const admin =
            getAdmin();


        const db =
            admin.firestore();


        const walletRef =
            db
                .collection(
                    "user_private"
                )
                .doc(
                    user.uid
                );



        // =====================================================
        // DIAMONDS -> COINS
        // =====================================================

        if (
            action ===
            "exchange"
        ) {

            let result =
                null;


            await db.runTransaction(
                async function(tx) {

                    const snap =
                        await tx.get(
                            walletRef
                        );


                    if (!snap.exists) {

                        const error =
                            new Error(
                                "WALLET_NOT_FOUND"
                            );

                        error.status =
                            404;

                        throw error;

                    }


                    const wallet =
                        snap.data();


                    const currentCoins =
                        Number(
                            wallet.coins ||
                            0
                        );


                    const currentDiamonds =
                        Number(
                            wallet.diamonds ||
                            0
                        );


                    if (
                        currentDiamonds <
                        diamonds
                    ) {

                        const error =
                            new Error(
                                "INSUFFICIENT_DIAMONDS"
                            );

                        error.status =
                            409;

                        throw error;

                    }


                    const newDiamonds =
                        currentDiamonds -
                        diamonds;


                    const newCoins =
                        currentCoins +
                        diamonds;


                    tx.update(
                        walletRef,
                        {
                            diamonds:
                                newDiamonds,

                            coins:
                                newCoins
                        }
                    );


                    result = {

                        exchangedDiamonds:
                            diamonds,

                        receivedCoins:
                            diamonds,

                        coins:
                            newCoins,

                        diamonds:
                            newDiamonds

                    };

                }
            );


            return json(
                res,
                200,
                {
                    ok:
                        true,

                    ...result
                }
            );

        }



        // =====================================================
        // WITHDRAW
        // =====================================================

        if (
            action ===
            "withdraw"
        ) {

            const withdrawRef =
                db
                    .collection(
                        "withdraw_requests"
                    )
                    .doc();


            await db.runTransaction(
                async function(tx) {

                    const snap =
                        await tx.get(
                            walletRef
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


                    const currentDiamonds =
                        Number(
                            snap.data().diamonds ||
                            0
                        );


                    if (
                        currentDiamonds <
                        diamonds
                    ) {

                        const error =
                            new Error(
                                "INSUFFICIENT_DIAMONDS"
                            );

                        error.status =
                            409;

                        throw error;

                    }


                    tx.update(
                        walletRef,
                        {
                            diamonds:
                                currentDiamonds -
                                diamonds
                        }
                    );


                    tx.set(
                        withdrawRef,
                        {

                            uid:
                                user.uid,

                            diamonds:
                                diamonds,

                            status:
                                "pending",

                            createdAt:
                                admin
                                    .firestore
                                    .FieldValue
                                    .serverTimestamp()

                        }
                    );

                }
            );


            return json(
                res,
                200,
                {

                    ok:
                        true,

                    requestId:
                        withdrawRef.id

                }
            );

        }



        // =====================================================
        // UNKNOWN ACTION
        // =====================================================

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
            "WALLET API ERROR:",
            error
        );


        return json(
            res,
            error.status ||
            400,
            {
                error:
                    error.message ||
                    "WALLET_FAILED"
            }
        );

    }

};