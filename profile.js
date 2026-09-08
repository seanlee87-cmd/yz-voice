import {
    requireUser,
    authFetch,
    uploadAvatar,
    logout
} from "./auth-client.js";

const $ = (id) => document.getElementById(id);

function setStatus(message = "", isError = false) {
    const el = $("status");
    if (!el) return;

    el.textContent = message;
    el.style.color = isError ? "#ff6b81" : "#8b5cf6";
}

/* =========================
   性别显示
========================= */

function genderText(gender) {
    if (gender === "male") return "男";
    if (gender === "female") return "女";
    if (gender === "other") return "其他";

    return "-";
}

/* =========================
   生日显示
========================= */

function birthdayText(profile) {
    if (!profile) return "-";

    const month = profile.birthMonth;
    const day = profile.birthDay;

    if (!month || !day) {
        return "-";
    }

    return `${month}月${day}日`;
}

/* =========================
   默认头像
========================= */

function getDefaultAvatar(profile) {
    const seed =
        profile?.publicId ||
        profile?.nickname ||
        "yzvoice";

    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

/* =========================
   加载个人资料
========================= */

async function loadProfile() {

    try {

        setStatus("正在加载个人资料...");

        const response = await authFetch("/api/profile");

        /*
         * 先读取 text，而不是直接 r.json()
         * 这样服务器如果返回 HTML / 错误文字，
         * 页面也不会直接崩掉。
         */

        const raw = await response.text();

        console.log("PROFILE API STATUS:", response.status);
        console.log("PROFILE API RAW:", raw);

        let data;

        try {
            data = JSON.parse(raw);
        } catch (error) {

            console.error(
                "Profile API 返回的不是 JSON:",
                raw
            );

            throw new Error(
                `个人资料 API 返回异常（HTTP ${response.status}）`
            );
        }

        if (!response.ok) {
            throw new Error(
                data?.error ||
                `读取个人资料失败（HTTP ${response.status}）`
            );
        }

        console.log("PROFILE DATA:", data);

        /*
         * 正常 API 应该：
         *
         * {
         *   profile: {...},
         *   wallet: {...}
         * }
         */

        const profile =
            data.profile ||
            data.user ||
            data;

        const wallet =
            data.wallet ||
            profile.wallet ||
            {};

        if (!profile) {
            throw new Error("服务器没有返回 profile 数据");
        }

        /* =========================
           头像
        ========================= */

        if ($("avatar")) {

            $("avatar").src =
                profile.avatarUrl ||
                profile.photoURL ||
                profile.photoUrl ||
                getDefaultAvatar(profile);

            $("avatar").onerror = () => {
                $("avatar").src =
                    getDefaultAvatar(profile);
            };
        }

        /* =========================
           昵称
        ========================= */

        if ($("nickname")) {
            $("nickname").textContent =
                profile.nickname ||
                profile.displayName ||
                "-";
        }

        /* =========================
           ID
        ========================= */

        if ($("public-id")) {
            $("public-id").textContent =
                profile.publicId ||
                profile.publicID ||
                "-";
        }

        /* =========================
           生日
        ========================= */

        if ($("birthday")) {
            $("birthday").textContent =
                birthdayText(profile);
        }

        /* =========================
           性别
        ========================= */

        if ($("gender")) {
            $("gender").textContent =
                genderText(profile.gender);
        }

        /* =========================
           金币
        ========================= */

        if ($("coins")) {
            $("coins").textContent =
                wallet.coins ??
                profile.coins ??
                0;
        }

        /* =========================
           钻石
        ========================= */

        if ($("diamonds")) {
            $("diamonds").textContent =
                wallet.diamonds ??
                profile.diamonds ??
                0;
        }

        /* =========================
           修改昵称输入框
        ========================= */

        if ($("new-nickname")) {
            $("new-nickname").value =
                profile.nickname ||
                profile.displayName ||
                "";
        }

        setStatus("");

        return data;

    } catch (error) {

        console.error(
            "加载个人资料失败:",
            error
        );

        setStatus(
            `加载失败：${error.message}`,
            true
        );

        throw error;
    }
}

/* =========================
   页面初始化
========================= */

async function initProfilePage() {

    try {

        /*
         * 检查 Firebase 登录状态
         */

        const user = await requireUser();

        console.log(
            "CURRENT FIREBASE USER:",
            user
        );

        /*
         * 登录成功后读取资料
         */

        await loadProfile();

    } catch (error) {

        console.error(
            "PROFILE INIT ERROR:",
            error
        );

        setStatus(
            `个人资料加载失败：${error.message}`,
            true
        );
    }
}

/* =========================
   更换头像
========================= */

if ($("change-avatar") && $("avatar-file")) {

    $("change-avatar").onclick = () => {

        $("avatar-file").click();

    };

    $("avatar-file").onchange = async (event) => {

        try {

            const file =
                event.target.files?.[0];

            if (!file) {
                return;
            }

            if (!file.type.startsWith("image/")) {
                throw new Error("请选择图片文件");
            }

            setStatus("头像上传中...");

            const url =
                await uploadAvatar(file);

            console.log(
                "AVATAR URL:",
                url
            );

            const response =
                await authFetch(
                    "/api/profile",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            avatarUrl: url
                        })
                    }
                );

            const raw =
                await response.text();

            let data = {};

            try {
                data = JSON.parse(raw);
            } catch {
                // ignore
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "头像保存失败"
                );
            }

            setStatus("头像已更新");

            await loadProfile();

        } catch (error) {

            console.error(
                "上传头像失败:",
                error
            );

            setStatus(
                error.message,
                true
            );
        }

    };

}

/* =========================
   修改昵称
========================= */

if ($("save-nickname")) {

    $("save-nickname").onclick =
        async () => {

            try {

                const nickname =
                    $("new-nickname")
                        .value
                        .trim();

                if (!nickname) {
                    throw new Error(
                        "昵称不能为空"
                    );
                }

                if (nickname.length > 20) {
                    throw new Error(
                        "昵称不能超过20个字符"
                    );
                }

                setStatus("正在保存昵称...");

                const response =
                    await authFetch(
                        "/api/profile",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                nickname
                            })
                        }
                    );

                const raw =
                    await response.text();

                let data = {};

                try {
                    data = JSON.parse(raw);
                } catch {
                    // ignore
                }

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "昵称修改失败"
                    );
                }

                setStatus("昵称已更新");

                await loadProfile();

            } catch (error) {

                console.error(
                    "修改昵称失败:",
                    error
                );

                setStatus(
                    error.message,
                    true
                );
            }

        };

}

/* =========================
   钻石提现
========================= */

if ($("withdraw")) {

    $("withdraw").onclick =
        async () => {

            try {

                const diamonds =
                    Number(
                        $("withdraw-amount").value
                    );

                if (
                    !Number.isFinite(diamonds) ||
                    diamonds <= 0
                ) {
                    throw new Error(
                        "请输入正确的钻石数量"
                    );
                }

                setStatus(
                    "正在提交提现申请..."
                );

                const response =
                    await authFetch(
                        "/api/wallet/withdraw-request",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                diamonds
                            })
                        }
                    );

                const raw =
                    await response.text();

                let data = {};

                try {
                    data = JSON.parse(raw);
                } catch {
                    // ignore
                }

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "提现申请失败"
                    );
                }

                $("withdraw-amount").value =
                    "";

                setStatus(
                    "提现申请已提交"
                );

                await loadProfile();

            } catch (error) {

                console.error(
                    "提现失败:",
                    error
                );

                setStatus(
                    error.message,
                    true
                );
            }

        };

}

/* =========================
   退出登录
========================= */

if ($("logout")) {

    $("logout").onclick =
        async () => {

            try {

                await logout();

                window.location.href =
                    "index.html";

            } catch (error) {

                console.error(
                    "退出登录失败:",
                    error
                );

                setStatus(
                    error.message,
                    true
                );
            }

        };

}

/* =========================
   START
========================= */

initProfilePage();

if ($("exchange-diamonds")) {

    $("exchange-diamonds").onclick =
        async () => {

            try {

                const diamonds =
                    Math.floor(
                        Number(
                            $("exchange-amount")
                                .value
                        )
                    );


                if (
                    !Number.isFinite(
                        diamonds
                    ) ||
                    diamonds <= 0
                ) {

                    throw new Error(
                        "请输入正确的钻石数量"
                    );

                }


                setStatus(
                    "正在兑换..."
                );


                const response =
                    await authFetch(
                        "/api/wallet/exchange-diamonds",
                        {
                            method:
                                "POST",

                            body:
                                JSON.stringify({
                                    diamonds
                                })
                        }
                    );


                const raw =
                    await response.text();


                let data =
                    {};


                try {

                    data =
                        JSON.parse(
                            raw
                        );

                } catch {
                }


                if (!response.ok) {

                    if (
                        data.error ===
                        "INSUFFICIENT_DIAMONDS"
                    ) {

                        throw new Error(
                            "钻石余额不足"
                        );

                    }


                    throw new Error(
                        data.error ||
                        "兑换失败"
                    );

                }


                $("exchange-amount")
                    .value =
                    "";


                setStatus(
                    `兑换成功：${diamonds} 钻石 → ${diamonds} 金币`
                );


                await loadProfile();

            }

            catch (error) {

                console.error(
                    "钻石兑换失败:",
                    error
                );


                setStatus(
                    error.message,
                    true
                );

            }

        };

}