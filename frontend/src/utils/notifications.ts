/**
 * ブラウザ通知の許可をリクエストします。
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
        console.warn("このブラウザは通知をサポートしていません。");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
};

/**
 * 通信を送信します。
 */
export const sendNotification = (title: string, body: string) => {
    if (Notification.permission === "granted") {
        new Notification(title, {
            body,
            icon: "/logo.png" // ロゴがあれば
        });
    }
};
