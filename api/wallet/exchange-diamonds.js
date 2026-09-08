const {
    getAdmin
} = require("../_lib/firebaseAdmin");


const {
    json,
    requireAuth
} = require("../_lib/http");


function readBody(req) {

    if (!req.body) {
        return {};
    }

    if (typeof req.body === "object") {
        return req.body;
    }

    if (typeof req.body === "string") {

        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }

    }

    return {};
}


module.exports =
async function handler(req, res) {

    try {

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


        const decoded =
            await requireAuth(req);


        const body =
            readBody(req);


        const diamonds =
            Math.floor(
                Number(
                    body.diamonds
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
                        "INVALID_DIAMOND_AMOUNT"
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
                    decoded.uid
                );


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
                        400;

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

    catch (error) {

        console.error(
            "DIAMOND EXCHANGE ERROR:",
            error
        );


        return json(
            res,
            error.status ||
            400,
            {
                error:
                    error.message ||
                    "EXCHANGE_FAILED"
            }
        );

    }

};