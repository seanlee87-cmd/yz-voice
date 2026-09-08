// =========================================================
// YZ VOICE
// AUTH CLIENT
//
// 功能：
// 1. Firebase Authentication 初始化
// 2. 保存登录状态
// 3. Google 登录
// 4. Custom Token 登录
// 5. 等待 Firebase 恢复登录状态
// 6. 获取当前用户
// 7. requireUser 登录保护
// 8. authFetch 自动携带 Firebase ID Token
// 9. 退出登录
// =========================================================


import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


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


import {
    firebaseConfig
} from "./firebase-config.js";



// =========================================================
// FIREBASE APP
// =========================================================

const app =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp(
            firebaseConfig
        );



// =========================================================
// FIREBASE AUTH
// =========================================================

const auth =
    getAuth(app);



// =========================================================
// LOCAL LOGIN PERSISTENCE
//
// browserLocalPersistence:
//
// 用户关闭浏览器后，登录状态仍然保存。
// 除非：
// - 用户主动退出登录
// - 清除浏览器网站数据
// - 浏览器限制本地存储
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

                console.error(
                    "❌ Firebase Persistence 设置失败：",
                    error
                );


                // 不让整个登录系统因为 persistence
                // 设置失败而完全停止
                persistenceReady =
                    false;

            }
        );



// =========================================================
// WAIT FOR AUTH INITIALIZATION
//
// Firebase 页面刚打开时需要一点时间读取本机保存的用户。
// 不能直接只检查 auth.currentUser，
// 否则可能误判成“未登录”。
// =========================================================

let authInitialized =
    false;


let authInitializationPromise =
    null;


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
//
// 首页可以这样：
//
// const user = await getCurrentUser();
//
// if (user) {
//     // 已登录
// }
// =========================================================

export async function getCurrentUser() {

    await persistencePromise;


    await waitForAuthInitialization();


    return auth.currentUser;

}



// =========================================================
// REQUIRE USER
//
// 默认：
// 如果没有登录，自动去 auth.html
//
// 使用：
//
// const user = await requireUser();
//
// 如果只想检查，不想跳转：
//
// const user = await requireUser(false);
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


        // 防止已经在登录页面时重复跳转
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


// 每次点击 Google 登录时显示账号选择。
// 对于多人共用电脑比较安全。

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


        // 给前端比较容易理解的错误

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
//
// Email 注册、ID+密码登录等后端成功后，
// 后端返回 customToken：
//
// await loginCustomToken(data.customToken);
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
//
// 给后端 API 验证身份。
// =========================================================

export async function getIdToken(
    forceRefresh = false
) {

    const user =
        await getCurrentUser();


    if (!user) {

        return null;

    }


    return await user.getIdToken(
        forceRefresh
    );

}



// =========================================================
// AUTH FETCH
//
// 自动把 Firebase ID Token 放进：
//
// Authorization: Bearer xxxxx
//
// 使用：
//
// const response = await authFetch(
//     "/api/profile"
// );
//
// POST：
//
// const response = await authFetch(
//     "/api/rooms/create",
//     {
//         method: "POST",
//         body: JSON.stringify({...})
//     }
// );
// =========================================================

export async function authFetch(
    url,
    options = {}
) {

    const user =
        await getCurrentUser();


    if (!user) {

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


    // Firebase ID Token

    headers.set(
        "Authorization",
        "Bearer " + token
    );


    // 如果有 body，
    // 而且调用方没有自己指定 Content-Type，
    // 默认使用 JSON

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
    // TOKEN EXPIRED RETRY
    //
    // 如果 Token 刚好过期，
    // 强制刷新一次 Token 后重试。
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
//
// 以后房间、首页、个人资料页面如果需要实时监听：
//
// const stop = listenAuthState(user => {
//     console.log(user);
// });
//
// stop(); 可以取消监听。
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


    return !!user;

}



// =========================================================
// EXPORT AUTH
//
// 一般页面不需要直接操作 auth，
// 但保留给以后开发使用。
// =========================================================

export {
    auth
};



// =========================================================
// DEBUG
// =========================================================

console.log(
    "✅ YZ Voice auth-client.js 已加载"
);