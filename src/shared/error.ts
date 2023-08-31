import { Roarr as log } from 'roarr';

export class LuminCLIError extends Error {
    constructor(message: string, innerError: Error | undefined) {
        super(message);
        this.innerError = innerError;
    }

    innerError: Error | undefined;
}

export const handleError = (message: string, error: Error | undefined, context?: any) => {
    log.error(context, message);
    throw new LuminCLIError(message, error);
};
