import { createLogger, format, transports, Logger } from 'winston';

const { combine, timestamp, printf, colorize } = format;

interface LogFormat {
    level: string;
    message: string;
    label?: string;
    timestamp?: string;
}

const myFormat = printf((info: LogFormat) => {
    const { level, message, timestamp } = info;
    return `${timestamp} [${level}] ${message}`;
});

const myCustomLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'blue',
        http: 'green',
        verbose: 'cyan',
        debug: 'magenta',
        silly: 'white'
    }
};


const developmentLogger = () => {
    return createLogger({
        levels: myCustomLevels.levels,
        format: combine(
            colorize({ all: true, colors: myCustomLevels.colors }),
            timestamp({ format: "YY-MM-DD HH:mm:ss" }),
            myFormat,
        ),
        transports: [
            new transports.File({ filename: 'logger/error.log', level: 'error' }),
            new transports.File({ filename: 'logger/warn.log', level: 'warning' }),
            new transports.File({ filename: 'logger/info.log', level: 'info' }),
            new transports.Console(),
        ],
    });
}

const productionLogger = () => {
    return createLogger({
        levels: myCustomLevels.levels,
        format: combine(
            colorize({ all: true, colors: myCustomLevels.colors }),
            timestamp({ format: "YY-MM-DD HH:mm:ss" }),
            myFormat,
        ),
        transports: [
            new transports.File({ filename: 'logger/error.log', level: 'error' }),
            new transports.File({ filename: 'logger/warn.log', level: 'warning' }),
            new transports.File({ filename: 'logger/info.log', level: 'info' }),
            new transports.Console(),
        ],
    });
}

let logger: Logger = developmentLogger();

if (process.env.NODE_ENV !== 'production') {
    logger = productionLogger();
}

export default logger;
