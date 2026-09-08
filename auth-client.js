// =========================================================
// YZ VOICE
// AUTH CLIENT - COMPLETE VERSION
//
// 功能：
// 1. Firebase App 初始化
// 2. Firebase Authentication
// 3. Firestore 初始化并 export db
// 4. 保存登录状态
// 5. Google 登录
// 6. Custom Token 登录
// 7. 等待登录状态恢复
// 8. requireUser
// 9. authFetch 自动携带 Firebase ID Token
// 10. Logout
// 11. 本机头像压缩
//
// 不使用 Firebase Storage
// =========================================================



// =========================================================
// FIREBASE APP
// =========================================================

import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";



// =========================================================
// FIREBASE AUTH
// =========================================================

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCustomToken,
    signOut,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";



// =========================================================
// FIRESTORE
// =========================================================

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";



// =========================================================
// FIREBASE CONFIG
// =========================================================

import {
    firebaseConfig
} from "./firebase-config.js";



// =========================================================
// FIREBASE APP INSTANCE
// =========================================================

const app =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp(
            firebaseConfig
        );



// =========================================================
// AUTH INSTANCE
// =========================================================

const auth =
    getAuth(app);



// =========================================================
// FIRESTORE INSTANCE
//
// room.js 会使用：
//
// import {
//     authFetch,
//     requireUser,
//     db
// } from "./auth-client.js";
//
// =========================================================

const db =
    getFirestore(app);



// =========================================================
// LOGIN PERSISTENCE
// =========================================================

let persistenceReady =
    false;


const persistencePromise =
    setPersistence(
        auth,
        browserLocalPersistence
    )
        .then(
            function () {

                persistenceReady =
                    true;


                console.log(
                    "✅ Firebase 登录状态保存已启用"
                );

            }
        )
        .catch(
            function (error) {

                persistenceReady =
                    false;


                console.error(
                    "❌ Firebase Persistence 设置失败：",
                    error
                );

            }
        );



// =========================================================
// AUTH INITIALIZATION STATE
// =========================================================

let authInitialized =
    false;


let authInitializationPromise =
    null;



// =========================================================
// WAIT FOR FIREBASE AUTH
// =========================================================

function waitForAuthInitialization() {

    if (
        authInitialized
    ) {

        return Promise.resolve(
            auth.currentUser
        );

    }


    if (
        authInitializationPromise
    ) {

        return authInitializationPromise;

    }


    authInitializationPromise =
        new Promise(
            function (resolve) {

                const unsubscribe =
                    onAuthStateChanged(

                        auth,

                        function (user) {

                            authInitialized =
                                true;


                            unsubscribe();


                            resolve(
                                user
                            );

                        },

                        function (error) {

                            authInitialized =
                                true;


                            unsubscribe();


                            console.error(
                                "❌ Firebase Auth 初始化失败：",
                                error
                            );


                            resolve(
                                null
                            );

                        }

                    );

            }
        );


    return authInitializationPromise;

}



// =========================================================
// GET CURRENT USER
// =========================================================

export async function getCurrentUser() {

    await persistencePromise;


    await waitForAuthInitialization();


    return auth.currentUser;

}



// =========================================================
// REQUIRE USER
//
// requireUser()
// 没登录 → auth.html
//
// requireUser(false)
// 没登录 → 返回 null
// =========================================================

export async function requireUser(
    redirectIfMissing = true
) {

    const user =
        await getCurrentUser();


    if (
        !user &&
        redirectIfMissing
    ) {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop();


        if (
            currentPage !==
            "auth.html"
        ) {

            window.location.href =
                "auth.html";

        }

    }


    return user;

}



// =========================================================
// GOOGLE PROVIDER
// =========================================================

const googleProvider =
    new GoogleAuthProvider();


googleProvider.setCustomParameters({

    prompt:
        "select_account"

});



// =========================================================
// GOOGLE LOGIN
// =========================================================

export async function loginGoogle() {

    await persistencePromise;


    try {

        const result =
            await signInWithPopup(
                auth,
                googleProvider
            );


        if (
            !result.user
        ) {

            throw new Error(
                "Google 登录失败"
            );

        }


        console.log(
            "✅ Google 登录成功：",
            result.user.uid
        );


        return result.user;

    }

    catch (error) {

        console.error(
            "❌ Google 登录失败：",
            error
        );


        if (
            error.code ===
            "auth/popup-closed-by-user"
        ) {

            throw new Error(
                "Google 登录窗口已关闭"
            );

        }


        if (
            error.code ===
            "auth/popup-blocked"
        ) {

            throw new Error(
                "浏览器阻止了 Google 登录窗口，请允许弹出窗口后再试"
            );

        }


        if (
            error.code ===
            "auth/unauthorized-domain"
        ) {

            throw new Error(
                "当前网站域名尚未加入 Firebase Authorized Domains"
            );

        }


        throw error;

    }

}



// =========================================================
// CUSTOM TOKEN LOGIN
// =========================================================

export async function loginCustomToken(
    customToken
) {

    await persistencePromise;


    if (
        !customToken ||
        typeof customToken !==
            "string"
    ) {

        throw new Error(
            "登录 Token 无效"
        );

    }


    try {

        const result =
            await signInWithCustomToken(
                auth,
                customToken
            );


        if (
            !result.user
        ) {

            throw new Error(
                "登录失败"
            );

        }


        console.log(
            "✅ Custom Token 登录成功：",
            result.user.uid
        );


        return result.user;

    }

    catch (error) {

        console.error(
            "❌ Custom Token 登录失败：",
            error
        );


        throw error;

    }

}



// =========================================================
// GET ID TOKEN
// =========================================================

export async function getIdToken(
    forceRefresh = false
) {

    const user =
        await getCurrentUser();


    if (
        !user
    ) {

        return null;

    }


    return await user.getIdToken(
        forceRefresh
    );

}



// =========================================================
// AUTH FETCH
//
// 自动加入：
//
// Authorization: Bearer FirebaseToken
//
// =========================================================

export async function authFetch(
    url,
    options = {}
) {

    const user =
        await getCurrentUser();


    if (
        !user
    ) {

        throw new Error(
            "请先登录"
        );

    }


    let token =
        await user.getIdToken();


    const headers =
        new Headers(
            options.headers ||
            {}
        );


    headers.set(
        "Authorization",
        "Bearer " + token
    );


    // JSON BODY

    if (
        options.body !==
            undefined &&
        !headers.has(
            "Content-Type"
        ) &&
        !(
            options.body instanceof
            FormData
        )
    ) {

        headers.set(
            "Content-Type",
            "application/json"
        );

    }


    let response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    // =====================================================
    // TOKEN EXPIRED
    // =====================================================

    if (
        response.status ===
        401
    ) {

        try {

            token =
                await user.getIdToken(
                    true
                );


            headers.set(
                "Authorization",
                "Bearer " + token
            );


            response =
                await fetch(
                    url,
                    {
                        ...options,
                        headers
                    }
                );

        }

        catch (error) {

            console.error(
                "❌ Token 刷新失败：",
                error
            );

        }

    }


    return response;

}



// =========================================================
// LOGOUT
// =========================================================

export async function logout() {

    try {

        await signOut(
            auth
        );


        console.log(
            "✅ 用户已退出登录"
        );


        window.location.href =
            "index.html";


        return true;

    }

    catch (error) {

        console.error(
            "❌ 退出登录失败：",
            error
        );


        throw error;

    }

}



// =========================================================
// AUTH STATE LISTENER
// =========================================================

export function listenAuthState(
    callback
) {

    if (
        typeof callback !==
        "function"
    ) {

        throw new Error(
            "callback 必须是函数"
        );

    }


    return onAuthStateChanged(
        auth,
        callback
    );

}



// =========================================================
// CHECK LOGIN
// =========================================================

export async function isLoggedIn() {

    const user =
        await getCurrentUser();


    return Boolean(
        user
    );

}



// =========================================================
// UPLOAD AVATAR
//
// Spark 免费版：
//
// 电脑选择图片
// ↓
// 浏览器裁剪
// ↓
// 256 × 256
// ↓
// WebP / JPEG
// ↓
// 返回 Data URL
//
// 不使用 Firebase Storage
// =========================================================

export async function uploadAvatar(
    file
) {

    if (
        !file
    ) {

        throw new Error(
            "请选择头像图片"
        );

    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        throw new Error(
            "请选择 JPG、PNG 或 WebP 图片"
        );

    }


    // 最大 5MB

    if (
        file.size >
        5 * 1024 * 1024
    ) {

        throw new Error(
            "图片不能超过 5MB"
        );

    }


    const user =
        await getCurrentUser();


    if (
        !user
    ) {

        throw new Error(
            "请先登录"
        );

    }


    const imageUrl =
        URL.createObjectURL(
            file
        );


    try {

        // =================================================
        // LOAD IMAGE
        // =================================================

        const image =
            await new Promise(
                function (
                    resolve,
                    reject
                ) {

                    const img =
                        new Image();


                    img.onload =
                        function () {

                            resolve(
                                img
                            );

                        };


                    img.onerror =
                        function () {

                            reject(
                                new Error(
                                    "图片读取失败"
                                )
                            );

                        };


                    img.src =
                        imageUrl;

                }
            );



        // =================================================
        // CANVAS
        // =================================================

        const size =
            256;


        const canvas =
            document.createElement(
                "canvas"
            );


        canvas.width =
            size;


        canvas.height =
            size;


        const ctx =
            canvas.getContext(
                "2d"
            );


        if (
            !ctx
        ) {

            throw new Error(
                "浏览器无法处理图片"
            );

        }



        // =================================================
        // CENTER CROP
        // =================================================

        const sourceSize =
            Math.min(
                image.width,
                image.height
            );


        const sourceX =
            (
                image.width -
                sourceSize
            ) / 2;


        const sourceY =
            (
                image.height -
                sourceSize
            ) / 2;


        ctx.clearRect(
            0,
            0,
            size,
            size
        );


        ctx.drawImage(

            image,

            sourceX,
            sourceY,

            sourceSize,
            sourceSize,

            0,
            0,

            size,
            size

        );



        // =================================================
        // WEBP
        // =================================================

        let dataUrl =
            canvas.toDataURL(
                "image/webp",
                0.78
            );


        // =================================================
        // FALLBACK JPEG
        // =================================================

        if (
            !dataUrl ||
            dataUrl.length <
                100
        ) {

            dataUrl =
                canvas.toDataURL(
                    "image/jpeg",
                    0.80
                );

        }



        // =================================================
        // SECOND COMPRESSION
        // =================================================

        if (
            dataUrl.length >
            300000
        ) {

            dataUrl =
                canvas.toDataURL(
                    "image/jpeg",
                    0.65
                );

        }



        // =================================================
        // FIRESTORE SAFETY LIMIT
        // =================================================

        if (
            dataUrl.length >
            400000
        ) {

            throw new Error(
                "头像压缩后仍然过大，请选择另一张图片"
            );

        }


        console.log(
            "✅ 头像压缩完成：",
            Math.round(
                dataUrl.length /
                1024
            ) +
            " KB"
        );


        return dataUrl;

    }

    finally {

        URL.revokeObjectURL(
            imageUrl
        );

    }

}



// =========================================================
// EXPORT FIREBASE OBJECTS
// =========================================================

export {
    auth,
    db
};



// =========================================================
// DEBUG
// =========================================================

console.log(
    "✅ YZ Voice auth-client.js 已加载"
);

console.log(
    "✅ Firebase Firestore db 已初始化"
);