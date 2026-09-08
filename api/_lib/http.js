const {
    getAdmin
} = require("./firebaseAdmin");


// =========================================================
// JSON RESPONSE
// =========================================================

function json(
    res,
    status,
    body
) {

    res
        .status(status)
        .setHeader(
            "Content-Type",
            "application/json; charset=utf-8"
        );


    return res.end(
        JSON.stringify(body)
    );

}


// =========================================================
// REQUIRE FIREBASE LOGIN
// =========================================================

async function requireAuth(req) {

    const authorization =
        req.headers.authorization ||
        "";


    if (
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        const error =
            new Error(
                "UNAUTHORIZED"
            );


        error.status =
            401;


        throw error;

    }


    const token =
        authorization.slice(7);


    return await getAdmin()
        .auth()
        .verifyIdToken(
            token
        );

}


// =========================================================
// REQUEST BODY
// =========================================================

function getBody(req) {

    if (!req.body) {

        return {};

    }


    if (
        typeof req.body ===
        "string"
    ) {

        try {

            return JSON.parse(
                req.body
            );

        }

        catch {

            return {};

        }

    }


    if (
        typeof req.body ===
        "object"
    ) {

        return req.body;

    }


    return {};

}


// =========================================================
// PASSWORD
//
// 至少8位
// 至少一个英文字母
// 至少一个数字
// =========================================================

function validatePassword(value) {

    const password =
        String(
            value ||
            ""
        );


    return (
        password.length >= 8 &&
        /[A-Za-z]/.test(
            password
        ) &&
        /\d/.test(
            password
        )
    );

}


// =========================================================
// NORMALIZE NICKNAME
//
// 用于昵称唯一性判断。
// 例如：
//
// "  Sean   Lee "
// ↓
// "sean lee"
// =========================================================

function normalizeNickname(value) {

    return String(
        value ||
        ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .toLocaleLowerCase();

}


// =========================================================
// VALIDATE NICKNAME
//
// 规则：
// 1. 1～20个字符
// 2. 不能全部为空格
// 3. 禁止换行和控制字符
//
// 中文、英文、数字、空格等都可以。
// =========================================================

function validateNickname(value) {

    const nickname =
        String(
            value ||
            ""
        ).trim();


    if (
        nickname.length <
        1
    ) {

        return false;

    }


    if (
        nickname.length >
        20
    ) {

        return false;

    }


    // 禁止换行 / Tab / 控制字符
    if (
        /[\u0000-\u001F\u007F]/.test(
            nickname
        )
    ) {

        return false;

    }


    return true;

}


// =========================================================
// BACKWARD COMPATIBILITY
//
// 你项目之前有些 API 可能仍然调用：
//
// body()
// nick()
//
// 所以暂时保留，避免其他功能突然坏掉。
// =========================================================

const body =
    getBody;


const nick =
    normalizeNickname;


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    json,

    requireAuth,

    // 新名称
    getBody,
    normalizeNickname,
    validateNickname,

    // 已有功能
    validatePassword,

    // 旧名称兼容
    body,
    nick

};