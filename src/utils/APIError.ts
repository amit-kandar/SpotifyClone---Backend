class APIError extends Error {
    statusCode: number
    message: string
    errors: Array<string>
    stack?: string
    data: any
    success: boolean

    constructor(
        statusCode: number,
        message: string = "Something went wrong",
        errors: Array<string>,
        stack?: string
    ) {
        super(message)
        this.message = message
        this.errors = errors
        this.statusCode = statusCode
        this.data = null
        this.success = false

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { APIError }