'use strict';

import logger from 'js-logger';

// log levels:
// -----
// TRACE (1)
// DEBUG (2)
// INFO  (3)
// TIME  (4)
// WARN  (5)
// ERROR (8)
// NONE  (99)
logger.setLevel(process.env.VUE_APP_DEBUG === 'true' || window.DEBUG ? logger.TRACE : logger.WARN);

const consoleHandler = logger.createDefaultHandler();

const _logs = [];
const memoryHandler = (messages, context) => {
    _logs.push({ context, messages, date: new Date() });
};

logger.setHandler((messages, context) => {
    consoleHandler(messages, context);
    memoryHandler(messages, context);
});

export { logger };

export const getLogs = (level) => {
    level = level || logger.TRACE;
    const logs = _logs
        .filter(({ context }) => context.level.value >= level.value)
        .map(({ context, messages, date }) => {
            const { name, level } = context;
            const msgs = Array.prototype.map.call(messages, (msg) => {
                if (typeof msg !== 'object') {
                    return String(msg);
                }
                try {
                    JSON.stringify(msg);
                    return msg;
                } catch (e) {
                    return '[Circular object]';
                }
            });

            return { name, level: level.name, date, msgs };
        });

    return logs;
};
