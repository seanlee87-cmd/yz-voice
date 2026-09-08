import {
    requireUser,
    authFetch
} from "./auth-client.js";


const $ = function (id) {
    return document.getElementById(id);
};


function setStatus(message, isError = false) {

    const element =
        $("status");

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        isError
            ? "error-text"
            : "ok-text";
}


async function createRoom() {

    try {

        const button =
            $("create");


        const title =
            $("room-title")
                .value
                .trim();


        const category =
            $("room-category")
                .value;


        const password =
            $("room-password")
                .value;


        if (!title) {

            throw new Error(
                window.t
                    ? window.t("roomNamePlaceholder")
                    : "请输入房间名称"
            );

        }


        if (
            title.length < 2
        ) {

            throw new Error(
                "房间名称至少需要2个字符"
            );

        }


        button.disabled =
            true;


        button.textContent =
            window.t
                ? window.t("creating")
                : "正在创建...";


        setStatus(
            ""
        );


        const response =
            await authFetch(
                "/api/rooms?action=create",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            title,

                            category,

                            password

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                (
                    window.t
                        ? window.t("roomCreateFailed")
                        : "创建房间失败"
                )
            );

        }


        if (!data.roomId) {

            throw new Error(
                "服务器没有返回房间ID"
            );

        }


        setStatus(
            "创建成功"
        );


        window.location.href =
            `room.html?id=${encodeURIComponent(data.roomId)}`;

    }

    catch (error) {

        console.error(
            "创建房间失败：",
            error
        );


        setStatus(
            error.message ||
            "创建房间失败",
            true
        );


        const button =
            $("create");


        if (button) {

            button.disabled =
                false;


            button.textContent =
                window.t
                    ? window.t("create")
                    : "创建";

        }

    }

}


async function initializeCreateRoomPage() {

    console.log(
        "✅ create-room.js 已加载"
    );


    try {

        await requireUser();

    }

    catch (error) {

        console.error(
            "用户登录检查失败：",
            error
        );


        window.location.href =
            "auth.html";

        return;

    }


    const button =
        $("create");


    if (!button) {

        console.error(
            "找不到创建房间按钮"
        );

        return;

    }


    button.addEventListener(
        "click",
        createRoom
    );


    console.log(
        "✅ 创建房间按钮已绑定"
    );

}


document.addEventListener(
    "DOMContentLoaded",
    initializeCreateRoomPage
);