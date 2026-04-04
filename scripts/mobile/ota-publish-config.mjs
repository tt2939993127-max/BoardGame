export const DEFAULT_FORCE_UPDATE_TITLE = '正在更新';
export const DEFAULT_FORCE_UPDATE_MESSAGE = '正在下载必要更新，请稍候';

export const resolveOtaForceUpdateOptions = ({
    forceUpdateFlag = false,
    noForceUpdateFlag = false,
    forceUpdateTitle = '',
    forceUpdateMessage = '',
} = {}) => {
    if (forceUpdateFlag && noForceUpdateFlag) {
        throw new Error('不能同时传 --force-update 和 --no-force-update。');
    }

    const forceUpdate = forceUpdateFlag && !noForceUpdateFlag;

    return {
        forceUpdate,
        forceUpdateTitle: forceUpdate
            ? (forceUpdateTitle.trim() || DEFAULT_FORCE_UPDATE_TITLE)
            : '',
        forceUpdateMessage: forceUpdate
            ? (forceUpdateMessage.trim() || DEFAULT_FORCE_UPDATE_MESSAGE)
            : '',
    };
};
