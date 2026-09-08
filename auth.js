import {
    loginGoogle,
    loginCustomToken,
    authFetch
} from "./auth-client.js";


// ======================================================
// HELPERS
// ======================================================

const $ = function (id) {
    return document.getElementById(id);
};


function setStatus(message, isError = false) {

    const element = $("auth-status");

    if (!element) {
        return;
    }

    element.textContent = message || "";

    element.className =
        isError
            ? "error-text"
            : "ok-text";
}


// ======================================================
// LOGIN / REGISTER TAB
// ======================================================

function showLogin() {

    const loginPanel =
        $("login-panel");

    const registerPanel =
        $("register-panel");

    const loginTab =
        $("tab-login");

    const registerTab =
        $("tab-register");


    loginPanel.hidden = false;

    registerPanel.hidden = true;


    loginTab.classList.add(
        "active"
    );

    registerTab.classList.remove(
        "active"
    );


    history.replaceState(
        null,
        "",
        "auth.html"
    );
}


function showRegister() {

    const loginPanel =
        $("login-panel");

    const registerPanel =
        $("register-panel");

    const loginTab =
        $("tab-login");

    const registerTab =
        $("tab-register");


    loginPanel.hidden = true;

    registerPanel.hidden = false;


    loginTab.classList.remove(
        "active"
    );

    registerTab.classList.add(
        "active"
    );


    history.replaceState(
        null,
        "",
        "auth.html?mode=register"
    );
}


// ======================================================
// REGISTRATION DATA
// ======================================================

function getRegisterProfile() {

    return {

        nickname:
            $("reg-nickname")
                .value
                .trim(),

        gender:
            $("reg-gender")
                .value,

        birthMonth:
            Number(
                $("reg-month").value
            ),

        birthDay:
            Number(
                $("reg-day").value
            ),

        birthYear:
            Number(
                $("reg-year").value
            )

    };
}


// ======================================================
// VALIDATE REGISTRATION
// ======================================================

function validateRegisterData(
    email,
    password,
    profile
) {

    if (!email) {

        throw new Error(
            "请输入 Email"
        );
    }


    if (
        password.length < 8 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password)
    ) {

        throw new Error(
            "密码至少8位，并且必须包含字母和数字"
        );
    }


    if (!profile.nickname) {

        throw new Error(
            "请输入昵称"
        );
    }


    if (
        profile.nickname.length < 2
    ) {

        throw new Error(
            "昵称至少需要2个字符"
        );
    }


    if (!profile.gender) {

        throw new Error(
            "请选择性别"
        );
    }


    if (
        profile.birthMonth < 1 ||
        profile.birthMonth > 12
    ) {

        throw new Error(
            "生日月份不正确"
        );
    }


    if (
        profile.birthDay < 1 ||
        profile.birthDay > 31
    ) {

        throw new Error(
            "生日日期不正确"
        );
    }


    const currentYear =
        new Date().getFullYear();


    if (
        profile.birthYear < 1900 ||
        profile.birthYear >
            currentYear
    ) {

        throw new Error(
            "生日年份不正确"
        );
    }
}


// ======================================================
// EMAIL REGISTER
// ======================================================

async function registerWithEmail() {

    try {

        setStatus(
            "正在注册..."
        );


        if (
            !$("reg-terms").checked
        ) {

            throw new Error(
                "请先同意用户条款"
            );
        }


        const email =
            $("reg-email")
                .value
                .trim();


        const password =
            $("reg-password")
                .value;


        const profile =
            getRegisterProfile();


        validateRegisterData(
            email,
            password,
            profile
        );


        const response =
            await fetch(
                "/api/auth/register-email",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email,
                            password,
                            ...profile
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "注册失败"
            );
        }


        if (
            !data.customToken
        ) {

            throw new Error(
                "服务器没有返回登录 Token"
            );
        }


        await loginCustomToken(
            data.customToken
        );


        setStatus(
            "注册成功"
        );


        window.location.href =
            "profile.html";

    }

    catch (error) {

        console.error(
            "Email注册失败：",
            error
        );


        setStatus(
            error.message,
            true
        );
    }
}


// ======================================================
// GOOGLE LOGIN / REGISTER
// ======================================================

async function googleLogin() {

    try {

        setStatus(
            "正在连接 Google..."
        );


        await loginGoogle();


        const response =
            await authFetch(
                "/api/profile"
            );


        // 第一次 Google 登录
        // 还没有建立 YZ Voice 用户资料

        if (
            response.status ===
            404
        ) {

            window.location.href =
                "onboarding.html";

            return;
        }


        if (!response.ok) {

            const data =
                await response.json()
                    .catch(
                        () => ({})
                    );


            throw new Error(
                data.error ||
                "读取用户资料失败"
            );
        }


        window.location.href =
            "index.html";

    }

    catch (error) {

        console.error(
            "Google登录失败：",
            error
        );


        setStatus(
            error.message,
            true
        );
    }
}


// ======================================================
// ID + PASSWORD LOGIN
// ======================================================

async function loginWithId() {

    try {

        setStatus(
            "正在登录..."
        );


        if (
            !$("login-terms").checked
        ) {

            throw new Error(
                "请先同意用户条款"
            );
        }


        const publicId =
            $("login-id")
                .value
                .trim();


        const password =
            $("login-password")
                .value;


        if (!publicId) {

            throw new Error(
                "请输入用户ID"
            );
        }


        if (!password) {

            throw new Error(
                "请输入密码"
            );
        }


        const response =
            await fetch(
                "/api/auth/login-id",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            publicId,
                            password
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "ID或密码不正确"
            );
        }


        if (
            !data.customToken
        ) {

            throw new Error(
                "登录 Token 获取失败"
            );
        }


        await loginCustomToken(
            data.customToken
        );


        setStatus(
            "登录成功"
        );


        window.location.href =
            "index.html";

    }

    catch (error) {

        console.error(
            "ID登录失败：",
            error
        );


        setStatus(
            error.message,
            true
        );
    }
}


// ======================================================
// INITIALIZE PAGE
// ======================================================

function initializeAuthPage() {

    console.log(
        "✅ auth.js 已加载"
    );


    const loginTab =
        $("tab-login");

    const registerTab =
        $("tab-register");


    if (
        !loginTab ||
        !registerTab
    ) {

        console.error(
            "找不到登录/注册标签按钮"
        );

        return;
    }


    // 登录 Tab

    loginTab.addEventListener(
        "click",
        showLogin
    );


    // 注册 Tab

    registerTab.addEventListener(
        "click",
        showRegister
    );


    // Email 注册

    $("email-register")
        ?.addEventListener(
            "click",
            registerWithEmail
        );


    // Google 登录

    $("google-login")
        ?.addEventListener(
            "click",
            googleLogin
        );


    // Google 注册

    $("google-register")
        ?.addEventListener(
            "click",
            googleLogin
        );


    // ID 登录

    $("id-login")
        ?.addEventListener(
            "click",
            loginWithId
        );


    // ==================================================
    // 首页点“注册”
    // auth.html?mode=register
    // 自动打开注册页
    // ==================================================

    const params =
        new URLSearchParams(
            window.location.search
        );


    if (
        params.get("mode") ===
        "register"
    ) {

        showRegister();

    }

    else {

        showLogin();

    }
}


// ======================================================
// START
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeAuthPage
);